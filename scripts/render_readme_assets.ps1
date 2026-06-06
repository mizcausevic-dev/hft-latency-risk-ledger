Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\screenshots'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

function New-ProofImage {
    param(
        [string]$Path,
        [string]$Title,
        [string]$Subtitle,
        [string[]]$Bullets
    )

    $width = 1800
    $height = 1080
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $bg = [System.Drawing.Color]::FromArgb(5, 8, 18)
    $panel = [System.Drawing.Color]::FromArgb(13, 23, 39)
    $line = [System.Drawing.Color]::FromArgb(78, 37, 215, 239)
    $text = [System.Drawing.Color]::FromArgb(244, 241, 234)
    $muted = [System.Drawing.Color]::FromArgb(168, 179, 199)
    $mint = [System.Drawing.Color]::FromArgb(95, 240, 182)

    $g.Clear($bg)
    $rect = New-Object System.Drawing.Rectangle 70, 70, 1660, 940
    $brush = New-Object System.Drawing.SolidBrush $panel
    $pen = New-Object System.Drawing.Pen $line, 3
    $g.FillRectangle($brush, $rect)
    $g.DrawRectangle($pen, $rect)

    $fontSmall = New-Object System.Drawing.Font 'Consolas', 24, ([System.Drawing.FontStyle]::Bold)
    $fontTitle = New-Object System.Drawing.Font 'Georgia', 54, ([System.Drawing.FontStyle]::Bold)
    $fontBody = New-Object System.Drawing.Font 'Segoe UI', 34, ([System.Drawing.FontStyle]::Regular)
    $fontBullet = New-Object System.Drawing.Font 'Segoe UI', 31, ([System.Drawing.FontStyle]::Regular)

    $g.DrawString('HFT Latency Risk Ledger', $fontSmall, (New-Object System.Drawing.SolidBrush $mint), 120, 125)
    $g.DrawString($Title, $fontTitle, (New-Object System.Drawing.SolidBrush $text), (New-Object System.Drawing.RectangleF 120, 205, 1450, 150))
    $g.DrawString($Subtitle, $fontBody, (New-Object System.Drawing.SolidBrush $muted), (New-Object System.Drawing.RectangleF 120, 410, 1500, 130))

    $y = 585
    foreach ($bullet in $Bullets) {
        $g.FillEllipse((New-Object System.Drawing.SolidBrush $mint), 125, ($y + 15), 12, 12)
        $g.DrawString($bullet, $fontBullet, (New-Object System.Drawing.SolidBrush $text), (New-Object System.Drawing.RectangleF 160, $y, 1450, 80))
        $y += 105
    }

    $g.DrawString('Synthetic proof render for README packaging.', $fontSmall, (New-Object System.Drawing.SolidBrush $muted), 120, 930)
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

New-ProofImage -Path (Join-Path $outDir '01-overview-proof.png') -Title 'Tail latency becomes an executive risk surface.' -Subtitle 'Rust scoring and Python diligence packs connect packet-level evidence to board-readable exposure.' -Bullets @(
    'CME Globex and NYSE Arca remain visible before execution quality breaks.',
    'p99 latency, jitter, loss, and stale quote events are tied to owner actions.',
    'Exposure is expressed as a decision ledger, not a raw trace dump.'
)

New-ProofImage -Path (Join-Path $outDir '02-ledger-proof.png') -Title 'Venue findings keep remediation accountable.' -Subtitle 'Each lane retains the strategy, venue, owner, control, risk score, and next containment action.' -Bullets @(
    'Escalate: isolate packet-loss sources before rebalance windows.',
    'Contain: suppress venue routes when strategy tolerance is exceeded.',
    'Watch: keep evidence attached to the owner and operating control.'
)
