import Vision
import AppKit
import CoreImage
let a = CommandLine.arguments
let url = URL(fileURLWithPath: a[1])
let ci = CIImage(contentsOf: url)!
let req = VNGenerateForegroundInstanceMaskRequest()
let h = VNImageRequestHandler(ciImage: ci)
try! h.perform([req])
guard let r = req.results?.first else { print("no subject"); exit(2) }
let buf = try! r.generateMaskedImage(ofInstances: r.allInstances, from: h, croppedToInstancesExtent: true)
let out = CIImage(cvPixelBuffer: buf)
let ctx = CIContext()
try! ctx.writePNGRepresentation(of: out, to: URL(fileURLWithPath: a[2]), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("ok", out.extent)
