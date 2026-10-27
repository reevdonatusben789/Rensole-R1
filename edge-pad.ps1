# Runs only while an Edge app (Prime, Netflix...) is open.
# Left stick = mouse | A = click | X = Enter | Y = on-screen keyboard | D-pad = arrows | right stick = scroll
# B tap = browser back | HOLD B (1 s) = close Edge and return to Rensole | LB+RB+Start also exits
# While the keyboard is open: D-pad = move, A = type, X = delete, Y or B = close.
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type -ReferencedAssemblies System.Windows.Forms, System.Drawing -TypeDefinition @"
using System.Windows.Forms;
public class KbForm : Form {
  protected override bool ShowWithoutActivation { get { return true; } }
  protected override CreateParams CreateParams { get { CreateParams p = base.CreateParams; p.ExStyle |= 0x08000000 | 0x00000008 | 0x00000080; return p; } }
}
"@
Add-Type @"
using System; using System.Runtime.InteropServices;
public class Pad {
  [StructLayout(LayoutKind.Sequential)] public struct GP { public ushort Buttons; public byte LT, RT; public short LX, LY, RX, RY; }
  [StructLayout(LayoutKind.Sequential)] public struct ST { public uint Packet; public GP Pad; }
  [DllImport("xinput1_4.dll")] public static extern int XInputGetState(int i, out ST s);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, int d, int e);
  [DllImport("user32.dll")] public static extern void keybd_event(byte k, byte s, uint f, int e);
}
"@
function Key($k) { [Pad]::keybd_event($k,0,0,0); [Pad]::keybd_event($k,0,2,0) }
function Quit { Write-Output 'EXIT'; [Console]::Out.Flush(); exit }

# ---------- on-screen keyboard (never steals focus from Edge) ----------
$rows = @(
  @('1','2','3','4','5','6','7','8','9','0','DEL'),
  @('q','w','e','r','t','y','u','i','o','p'),
  @('a','s','d','f','g','h','j','k','l','@'),
  @('z','x','c','v','b','n','m','.','-','_'),
  @('SPACE','.com','ENTER','CLOSE'))
$kb = New-Object KbForm
$kb.FormBorderStyle = 'None'; $kb.TopMost = $true; $kb.ShowInTaskbar = $false; $kb.StartPosition = 'Manual'
$kb.BackColor = [Drawing.Color]::FromArgb(28,28,34)
$scr = [Windows.Forms.Screen]::PrimaryScreen.Bounds
$KW = [Math]::Min(1100, $scr.Width - 80); $KH = 350
$kb.Size = New-Object Drawing.Size($KW, $KH)
$kb.Location = New-Object Drawing.Point([int](($scr.Width - $KW) / 2), [int]($scr.Height - $KH - 60))
$unit = [int](($KW - 40) / 11); $font = New-Object Drawing.Font('Segoe UI', 20, [Drawing.FontStyle]::Bold)
$cells = @()
for ($r = 0; $r -lt $rows.Count; $r++) {
  $x = 20; $line = @()
  foreach ($k in $rows[$r]) {
    $w = $unit - 6
    if ($k -eq 'SPACE') { $w = $unit * 4 - 6 } elseif ($k -in '.com','ENTER','CLOSE') { $w = $unit * 2 - 6 }
    $l = New-Object Windows.Forms.Label
    $l.Text = $k; if ($k -eq 'DEL') { $l.Text = 'Del' }; if ($k -eq 'SPACE') { $l.Text = 'Space' }; if ($k -eq 'ENTER') { $l.Text = 'Enter' }; if ($k -eq 'CLOSE') { $l.Text = 'Close' }
    $l.TextAlign = 'MiddleCenter'; $l.Font = $font; $l.Size = New-Object Drawing.Size($w, 56)
    $l.Location = New-Object Drawing.Point($x, (20 + $r * 64)); $kb.Controls.Add($l)
    $line += $l; $x += $w + 6
  }
  $cells += ,$line
}
$script:kbOpen = $false; $script:kr = 1; $script:kc = 0
function KbPaint {
  for ($r = 0; $r -lt $cells.Count; $r++) { for ($c = 0; $c -lt $cells[$r].Count; $c++) {
    $l = $cells[$r][$c]
    if ($r -eq $script:kr -and $c -eq $script:kc) { $l.BackColor = [Drawing.Color]::FromArgb(245,245,247); $l.ForeColor = [Drawing.Color]::FromArgb(17,17,17) }
    else { $l.BackColor = [Drawing.Color]::FromArgb(58,58,68); $l.ForeColor = [Drawing.Color]::White }
  } }
}
function KbShow { $script:kbOpen = $true; KbPaint; $kb.Show(); $kb.TopMost = $true }
function KbHide { $script:kbOpen = $false; $kb.Hide() }
function KbMove($dr, $dc) {
  $r = $script:kr; $c = $script:kc
  if ($dr -ne 0) {
    $nr = [Math]::Max(0, [Math]::Min($rows.Count - 1, $r + $dr))
    if ($nr -eq 4 -and $r -ne 4) { $c = if ($c -le 4) { 0 } elseif ($c -le 6) { 1 } elseif ($c -le 8) { 2 } else { 3 } }
    elseif ($r -eq 4 -and $nr -ne 4) { $c = @(2, 5, 7, 9)[$c] }
    $r = $nr
  }
  $c = [Math]::Max(0, [Math]::Min($rows[$r].Count - 1, $c + $dc))
  $script:kr = $r; $script:kc = $c; KbPaint
}
function KbPress {
  $k = $rows[$script:kr][$script:kc]
  switch ($k) {
    'DEL'   { [Windows.Forms.SendKeys]::SendWait('{BACKSPACE}') }
    'SPACE' { [Windows.Forms.SendKeys]::SendWait(' ') }
    'ENTER' { [Windows.Forms.SendKeys]::SendWait('{ENTER}'); KbHide }
    'CLOSE' { KbHide }
    default { [Windows.Forms.SendKeys]::SendWait($k) }
  }
}

# ---------- main loop ----------
$prev = 0; $bAt = $null; $n = 0; $t0 = Get-Date
while ($true) {
  $n++
  if ($script:kbOpen) { [Windows.Forms.Application]::DoEvents() }
  # Edge fell back to its start page: return to Rensole
  if ($n % 30 -eq 0 -and ((Get-Date) - $t0).TotalSeconds -gt 5) {
    if (Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match '^(New (InPrivate )?tab|InPrivate browsing)' }) { Quit }
  }
  $st = New-Object Pad+ST; $ok = $false
  foreach ($i in 0..3) { if ([Pad]::XInputGetState($i, [ref]$st) -eq 0) { $ok = $true; break } }
  if ($ok) {
    $b = [int]$st.Pad.Buttons; $new = $b -band (-bnot $prev)
    if (($b -band 0x0310) -eq 0x0310) { Quit }
    # hold B = exit (works with or without the keyboard)
    if ($new -band 0x2000) { $bAt = Get-Date }
    if ($bAt -and ($b -band 0x2000) -and (((Get-Date) - $bAt).TotalMilliseconds -gt 1000)) { Quit }
    if ($script:kbOpen) {
      if ($new -band 1) { KbMove -1 0 }; if ($new -band 2) { KbMove 1 0 }; if ($new -band 4) { KbMove 0 -1 }; if ($new -band 8) { KbMove 0 1 }
      if ($new -band 0x1000) { KbPress }
      if ($new -band 0x4000) { [Windows.Forms.SendKeys]::SendWait('{BACKSPACE}') }
      if ($new -band 0x8000) { KbHide }
      if ($bAt -and -not ($b -band 0x2000)) { KbHide; $bAt = $null }
    } else {
      $lx = $st.Pad.LX; $ly = $st.Pad.LY; $ry = $st.Pad.RY
      if ([Math]::Abs($lx) -gt 8000 -or [Math]::Abs($ly) -gt 8000) { [Pad]::mouse_event(1, [int]($lx/32768*18), [int](-$ly/32768*18), 0, 0) }
      if ([Math]::Abs($ry) -gt 8000) { [Pad]::mouse_event(0x0800, 0, 0, [int]($ry/32768*60), 0) }
      if ($new -band 0x1000) { [Pad]::mouse_event(2,0,0,0,0); [Pad]::mouse_event(4,0,0,0,0) }
      if ($new -band 0x4000) { Key 0x0D }
      if ($new -band 0x8000) { KbShow }
      if ($new -band 1) { Key 0x26 }; if ($new -band 2) { Key 0x28 }; if ($new -band 4) { Key 0x25 }; if ($new -band 8) { Key 0x27 }
      if ($bAt -and -not ($b -band 0x2000)) { [Pad]::keybd_event(0x12,0,0,0); Key 0x25; [Pad]::keybd_event(0x12,0,2,0); $bAt = $null }
    }
    $prev = $b
  }
  Start-Sleep -Milliseconds 16
}
