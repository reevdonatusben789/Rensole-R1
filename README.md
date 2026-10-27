# Rensole R1

**A console-style game and Smart TV launcher for Windows PC, built for Xbox controllers.**

Rensole R1 turns your PC into a living-room console. It opens full screen with a clean, Apple TV-inspired interface, finds your installed games, and lets you play games and stream YouTube, Prime Video, Netflix and more, all from the couch with just a controller.

Made by **Reev D.B studios**.

[**Download the latest version**](https://github.com/reevdonatusben789/rensole/releases/latest)

<!-- Add a screenshot: put an image at docs/screenshot.png and remove the comment marks around the next line -->
<!-- ![Rensole R1 home screen](docs/screenshot.png) -->

---

## Features

- **Console-style home screen.** A full-screen row of game covers with a soft, rounded Apple TV-like design, smooth focus animations and sound effects.
- **Xbox controller support.** Navigate the whole app with an Xbox (XInput) controller, wired or Bluetooth. Keyboard and mouse work too.
- **Finds your Steam games automatically.** Installed Steam games appear with their cover art.
- **Add any game.** Press **Y** and choose an `.exe`, shortcut or `.bat` file. Your most recently played games move to the front.
- **Smart TV tab.** Launch YouTube, Prime Video, Netflix, JioHotstar, SonyLIV, ZEE5, Twitch and a web browser from the same screen.
- **YouTube inside Rensole.** It opens in its own TV-style view and is fully controller-friendly.
- **Prime, Netflix and other DRM apps open in Microsoft Edge** (full screen), with controller mouse control and an on-screen keyboard so you can still use them from the couch.
- **Accounts or guest mode.** Sign in with email or continue as a guest.
- **Power menu.** Sleep, restart, shut down or quit, right from the controller.
- **Automatic updates.** Installed copies check for new versions and update themselves.

## Requirements

- Windows 10 or Windows 11 (64-bit)
- An Xbox-style (XInput) controller (recommended; keyboard and mouse also work)
- Steam (optional, for automatic game detection)
- Microsoft Edge (included with Windows) for Prime Video, Netflix and similar apps
- An internet connection for streaming apps and sign-in

## Install

1. Go to the [Releases page](https://github.com/reevdonatusben789/rensole/releases/latest).
2. Download **`Rensole-Setup-x.x.x.exe`** and run it.
3. If Windows shows **"Windows protected your PC"**, click **More info**, then **Run anyway**. Rensole is not code-signed yet, so Windows shows this for new apps.
4. Open **Rensole** from the Start menu or desktop shortcut.

## Controls

### Home screen

| Controller | Keyboard | Action |
|---|---|---|
| D-pad / left stick | Arrow keys or W A S D | Move |
| **A** | Enter | Play / open |
| **B** | Esc | Back / close menu |
| **X** | X or Delete | Remove a game you added |
| **Y** | Y | Add a game |
| **LB / RB** | Q / E or Tab | Switch between Games and Smart TV |
| **Menu** | M | Power and settings menu |

### Inside YouTube

| Controller | Action |
|---|---|
| D-pad / left stick | Move |
| **A** / **B** / **X** | Select / back / space |
| Right stick | Move the on-screen pointer |
| **RT** | Click |
| **LT** + right stick | Scroll |
| **Menu** | Return to Rensole |

### Inside Edge apps (Prime Video, Netflix, etc.)

| Controller | Action |
|---|---|
| Left stick | Move the mouse |
| **A** | Click |
| **X** | Enter |
| **Y** | Open or close the on-screen keyboard |
| D-pad | Arrow keys |
| Right stick | Scroll |
| **B** (tap) | Browser back |
| **B** (hold for 1 second) | Return to Rensole |
| **LB + RB + Start** | Return to Rensole |

## Open Rensole with the Xbox button (optional)

Windows does not give the Xbox button to normal apps, so the repository includes a small helper script. Run `install-guide-button.ps1` once (right-click, **Run with PowerShell**). Turn off the Game Bar option that grabs the button in **Settings, Gaming, Xbox Game Bar** first.

## Run from source

```bash
git clone https://github.com/reevdonatusben789/rensole.git
cd rensole
npm install
npm start
```

To sign in, create a `firebase-config.json` file next to `main.js` containing your own Firebase project's web API key:

```json
{ "apiKey": "YOUR_FIREBASE_WEB_API_KEY" }
```

Build the Windows installer with `npm run dist`. The installer appears in the `dist` folder.

## Built with

Electron, plain HTML, CSS and JavaScript, Firebase Authentication (REST API), and PowerShell for the Edge controller helper.

## Known limitations

- Windows only.
- Xbox/XInput controllers only. PlayStation and generic pads in DirectInput mode may not work.
- Only Steam games are detected automatically. Other launchers (Epic, GOG, Xbox app) can be added manually with **Y**.
- Streaming apps that need DRM open in Edge, so the controller acts as a mouse there.

## Disclaimer

Rensole R1 is an independent project and is **not affiliated with, endorsed by or sponsored by** Microsoft, Valve, Google, Amazon, Netflix, JioStar, Sony, ZEE, Twitch or any other company. All product names, logos and brands are the property of their respective owners and are used only to identify the services that Rensole can open. Rensole does not host, copy or provide any video content.

---

**Rensole R1** is made by Reev D.B studios.
