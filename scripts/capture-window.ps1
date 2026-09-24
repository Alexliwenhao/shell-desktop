# Capture one top-level application window to a PNG through PrintWindow.
#
# The feature-screenshot runner drives the app over CDP, but an occluded
# Electron window stops producing compositor frames, so `Page.captureScreenshot`
# there waits forever. PrintWindow renders the window directly and works while
# the window is hidden behind other windows. This helper belongs to
# scripts/capture-feature-screenshots.cjs.
param(
  [string]$Title = 'AI Shell Desktop',
  [string]$Out = 'window.png',
  [int]$WaitMs = 800,
  [switch]$RestoreOnly
)
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class Win32Capture {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
}
"@
Add-Type -AssemblyName System.Drawing

$handle = [IntPtr]::Zero
$processes = @(Get-Process -Name electron, 'Shell Desktop' -ErrorAction SilentlyContinue)
foreach ($process in $processes) {
  if ($process.MainWindowHandle -eq [IntPtr]::Zero) { continue }
  $builder = New-Object System.Text.StringBuilder 512
  [Win32Capture]::GetWindowText($process.MainWindowHandle, $builder, 512) | Out-Null
  if ($builder.ToString() -match $Title) { $handle = $process.MainWindowHandle; break }
}
if ($handle -eq [IntPtr]::Zero) {
  Write-Error "no visible window matching '$Title'"
  exit 1
}

# Restore and raise the window: PrintWindow returns a blank surface for a
# minimized window and for a composited surface that has never been shown.
[Win32Capture]::ShowWindow($handle, 9) | Out-Null
[Win32Capture]::SetWindowPos($handle, [IntPtr]-1, 0, 0, 0, 0, 0x0003) | Out-Null
[Win32Capture]::SetForegroundWindow($handle) | Out-Null
Start-Sleep -Milliseconds $WaitMs

if ($RestoreOnly) {
  [Win32Capture]::SetWindowPos($handle, [IntPtr]-2, 0, 0, 0, 0, 0x0003) | Out-Null
  Write-Output 'restored'
  exit 0
}

$rect = New-Object Win32Capture+RECT
[Win32Capture]::GetWindowRect($handle, [ref]$rect) | Out-Null
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -lt 800 -or $height -lt 600) {
  Write-Error "window is still minimized (${width}x${height}); restore it before capturing"
  exit 1
}
$bitmap = New-Object Drawing.Bitmap $width, $height
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$hdc = $graphics.GetHdc()
try {
  $ok = [Win32Capture]::PrintWindow($handle, $hdc, 2)
  if (-not $ok) { Write-Error 'PrintWindow failed'; exit 1 }
} finally {
  $graphics.ReleaseHdc($hdc)
}
$bitmap.Save($Out, [Drawing.Imaging.ImageFormat]::Png)
[Win32Capture]::SetWindowPos($handle, [IntPtr]-2, 0, 0, 0, 0, 0x0003) | Out-Null
$graphics.Dispose()
$bitmap.Dispose()
Write-Output "captured $Out ${width}x${height}"
