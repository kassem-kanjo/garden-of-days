// Builds a macOS-style app icon (rounded square, soft shadow) from a square source image.
// usage: swift make-icon.swift <source.png> <out-1024.png>
import AppKit

let args = CommandLine.arguments
guard args.count >= 3, let src = NSImage(contentsOfFile: args[1]) else {
    FileHandle.standardError.write("usage: make-icon <source> <out>\n".data(using: .utf8)!)
    exit(1)
}

let size = 1024
guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
                                 bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                                 colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else { exit(1) }

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let ctx = NSGraphicsContext.current!.cgContext
ctx.interpolationQuality = .high

// Apple icon grid: 824pt body centred in 1024 canvas, corner radius ~185.
let body = NSRect(x: 100, y: 100, width: 824, height: 824)
let path = NSBezierPath(roundedRect: body, xRadius: 185, yRadius: 185)

// Soft drop shadow under the tile.
ctx.saveGState()
let shadow = NSShadow()
shadow.shadowColor = NSColor(calibratedRed: 0.10, green: 0.12, blue: 0.30, alpha: 0.35)
shadow.shadowOffset = NSSize(width: 0, height: -12)
shadow.shadowBlurRadius = 28
shadow.set()
NSColor(calibratedRed: 0.455, green: 0.537, blue: 0.847, alpha: 1).setFill()
path.fill()
ctx.restoreGState()

// Artwork, slightly zoomed so the tree fills the tile nicely.
ctx.saveGState()
path.addClip()
let zoom: CGFloat = 1.10
let w = body.width * zoom
let drawRect = NSRect(x: body.midX - w / 2, y: body.midY - w / 2 + 14, width: w, height: w)
src.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1)

// Gentle top sheen + inner hairline, like native icons.
let sheen = NSGradient(colors: [NSColor(white: 1, alpha: 0.10), NSColor(white: 1, alpha: 0)])!
sheen.draw(in: NSRect(x: body.minX, y: body.midY, width: body.width, height: body.height / 2), angle: -90)
ctx.restoreGState()

NSColor(white: 1, alpha: 0.18).setStroke()
let hair = NSBezierPath(roundedRect: body.insetBy(dx: 1, dy: 1), xRadius: 184, yRadius: 184)
hair.lineWidth = 2
hair.stroke()

NSGraphicsContext.restoreGraphicsState()

let png = rep.representation(using: .png, properties: [:])!
try! png.write(to: URL(fileURLWithPath: args[2]))
print("wrote \(args[2])")
