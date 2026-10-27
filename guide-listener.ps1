# Runs in the background. Press the Xbox (Guide) button on any XInput controller to open Deck.
Add-Type @"
using System.Runtime.InteropServices;
[StructLayout(LayoutKind.Sequential)] public struct XGP { public ushort wButtons; public byte bLT; public byte bRT; public short lx; public short ly; public short rx; public short ry; }
[StructLayout(LayoutKind.Sequential)] public struct XST { public uint pkt; public XGP gp; }
public static class XI { [DllImport("xinput1_4.dll", EntryPoint="#100")] public static extern int GetStateEx(int i, ref XST s); }
"@
$electron = Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'
$prev = $false
while ($true) {
  $down = $false
  for ($i = 0; $i -lt 4; $i++) {
    $s = New-Object XST
    if ([XI]::GetStateEx($i, [ref]$s) -eq 0 -and ($s.gp.wButtons -band 0x0400)) { $down = $true }
  }
  if ($down -and -not $prev) { Start-Process $electron -ArgumentList "`"$PSScriptRoot`"" }
  $prev = $down
  Start-Sleep -Milliseconds 60
}
