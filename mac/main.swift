// Garden of Days — native macOS shell: a single borderless-feeling window hosting the web garden.
import Cocoa
import WebKit

final class Store {
    let dir: URL
    let file: URL
    let backups: URL

    init() {
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        dir = support.appendingPathComponent("Garden of Days", isDirectory: true)
        file = dir.appendingPathComponent("data.json")
        backups = dir.appendingPathComponent("backups", isDirectory: true)
        try? FileManager.default.createDirectory(at: backups, withIntermediateDirectories: true)
    }

    func log(_ line: String) {
        let url = dir.appendingPathComponent("log.txt")
        let stamped = "[\(ISO8601DateFormatter().string(from: Date()))] \(line)\n"
        if let h = try? FileHandle(forWritingTo: url) {
            h.seekToEndOfFile(); h.write(stamped.data(using: .utf8)!); try? h.close()
        } else {
            try? stamped.data(using: .utf8)!.write(to: url)
        }
    }

    func load() -> String? {
        guard let d = try? Data(contentsOf: file), let s = String(data: d, encoding: .utf8),
              (try? JSONSerialization.jsonObject(with: d)) != nil else { return nil }
        return s
    }

    func save(_ json: String) {
        guard let d = json.data(using: .utf8), (try? JSONSerialization.jsonObject(with: d)) != nil else { return }
        try? d.write(to: file, options: .atomic)
        // One rolling backup per day, keep the last 30.
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        let daily = backups.appendingPathComponent("data-\(f.string(from: Date())).json")
        try? d.write(to: daily, options: .atomic)
        if let all = try? FileManager.default.contentsOfDirectory(at: backups, includingPropertiesForKeys: nil)
            .filter({ $0.pathExtension == "json" }).sorted(by: { $0.lastPathComponent > $1.lastPathComponent }),
           all.count > 30 {
            all.dropFirst(30).forEach { try? FileManager.default.removeItem(at: $0) }
        }
    }
}

final class GardenView: WKWebView {
    // Let the first click into an inactive window also count as a click on the garden.
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate, NSWindowDelegate {
    var window: NSWindow!
    var web: WKWebView!
    let store = Store()
    let sky = NSColor(calibratedRed: 0x74 / 255.0, green: 0x89 / 255.0, blue: 0xD8 / 255.0, alpha: 1)

    func applicationDidFinishLaunching(_ note: Notification) {
        buildMenu()

        let config = WKWebViewConfiguration()
        let ucc = WKUserContentController()
        ucc.add(self, name: "garden")
        let initial = store.load() ?? "null"
        let boot = """
        window.__GARDEN_DATA__ = \(initial);
        document.documentElement.classList.add('native-mac');
        window.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        """
        ucc.addUserScript(WKUserScript(source: boot, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        // Leave room for the window's traffic lights in the header.
        // The transparent title bar still swallows clicks in the top strip, so the header buttons sit below it.
        let css = "html.native-mac #header{padding-left:104px !important} html.native-mac #header .controls{margin-top:34px}"
        ucc.addUserScript(WKUserScript(source: "(function(){var s=document.createElement('style');s.textContent='\(css)';document.documentElement.appendChild(s);})();",
                                       injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        config.userContentController = ucc
        config.mediaTypesRequiringUserActionForPlayback = []
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        // Size the window to ~90% of the screen at the garden's 16:10 aspect.
        let vis = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        var w = min(1440, vis.width * 0.92)
        var h = w * 900 / 1440
        if h > vis.height * 0.92 { h = vis.height * 0.92; w = h * 1440 / 900 }
        let rect = NSRect(x: vis.midX - w / 2, y: vis.midY - h / 2, width: w, height: h)

        window = NSWindow(contentRect: rect,
                          styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                          backing: .buffered, defer: false)
        window.title = "Garden of Days"
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.isMovableByWindowBackground = false
        window.backgroundColor = sky
        window.contentAspectRatio = NSSize(width: 1440, height: 900)
        window.minSize = NSSize(width: 900, height: 562)
        window.delegate = self
        window.setFrameAutosaveName("GardenOfDaysMain")

        web = GardenView(frame: window.contentView!.bounds, configuration: config)
        web.autoresizingMask = [.width, .height]
        web.navigationDelegate = self
        web.setValue(false, forKey: "drawsBackground")
        web.allowsMagnification = false
        if #available(macOS 13.3, *) { web.isInspectable = true }
        window.contentView!.addSubview(web)

        let res = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true)
        web.loadFileURL(res.appendingPathComponent("index.html"), allowingReadAccessTo: res)

        window.alphaValue = 0
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Fade the garden in once painted.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
            NSAnimationContext.runAnimationGroup { ctx in
                ctx.duration = 0.6
                self.window.animator().alphaValue = 1
            }
        }
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "garden", let body = message.body as? [String: Any],
              let type = body["type"] as? String else { return }
        if type == "save", let json = body["data"] as? String { store.save(json) }
        if type == "log", let line = body["data"] as? String { store.log(line) }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationWillTerminate(_ notification: Notification) {
        // Ask the page to flush any pending save.
        web?.evaluateJavaScript("window.dispatchEvent(new Event('beforeunload'))", completionHandler: nil)
    }

    @objc func reloadGarden(_ sender: Any?) { web.reload() }

    @objc func revealData(_ sender: Any?) { NSWorkspace.shared.activateFileViewerSelecting([store.file]) }

    func buildMenu() {
        let main = NSMenu()
        let appItem = NSMenuItem(); main.addItem(appItem)
        let app = NSMenu()
        app.addItem(withTitle: "About Garden of Days", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        app.addItem(.separator())
        app.addItem(withTitle: "Show Data in Finder", action: #selector(revealData(_:)), keyEquivalent: "")
        app.addItem(.separator())
        app.addItem(withTitle: "Hide Garden of Days", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        app.addItem(withTitle: "Quit Garden of Days", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = app

        // Edit menu so typing shortcuts (copy, paste, select all, undo) work in the rename fields.
        let editItem = NSMenuItem(); main.addItem(editItem)
        let edit = NSMenu(title: "Edit")
        edit.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        let redo = NSMenuItem(title: "Redo", action: Selector(("redo:")), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        edit.addItem(redo)
        edit.addItem(.separator())
        edit.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit

        let viewItem = NSMenuItem(); main.addItem(viewItem)
        let view = NSMenu(title: "View")
        view.addItem(withTitle: "Reload", action: #selector(reloadGarden(_:)), keyEquivalent: "r")
        let fs = NSMenuItem(title: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fs.keyEquivalentModifierMask = [.command, .control]
        view.addItem(fs)
        viewItem.submenu = view

        let winItem = NSMenuItem(); main.addItem(winItem)
        let win = NSMenu(title: "Window")
        win.addItem(withTitle: "Minimize", action: #selector(NSWindow.miniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: "Close", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        winItem.submenu = win
        NSApp.windowsMenu = win

        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
