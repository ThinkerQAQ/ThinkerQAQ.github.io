package bridge

import (
	"io/fs"
	"net"
	"net/http"
	"strings"

	blogextension "github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/extension"
)

func consoleHostAllowed(host string) bool {
	name, port, err := net.SplitHostPort(host)
	if err != nil || port != "32145" {
		return false
	}
	return name == "127.0.0.1" || name == "localhost"
}

// The console serves static, compiled public UI assets. Privileged operations
// go through the installed browser Extension's authenticated bridge transport;
// ordinary HTTP requests cannot acquire the native Bridge token.
func (s *Server) serveConsole(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !consoleHostAllowed(r.Host) {
		http.Error(w, "invalid console host", http.StatusForbidden)
		return
	}
	// Reject speculative subresource fetches initiated by other websites.
	if strings.EqualFold(r.Header.Get("sec-fetch-site"), "cross-site") &&
		!strings.EqualFold(r.Header.Get("sec-fetch-mode"), "navigate") {
		http.Error(w, "cross-site console resources are forbidden", http.StatusForbidden)
		return
	}
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Referrer-Policy", "no-referrer")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Security-Policy",
		"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; "+
			"connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
	if r.URL.Path == "/console" || r.URL.Path == "/console/" {
		http.Redirect(w, r, "/console/popup/popup.html", http.StatusFound)
		return
	}
	subtree, err := fs.Sub(blogextension.Assets, ".")
	if err != nil {
		http.Error(w, "console unavailable", 500)
		return
	}
	http.StripPrefix("/console/", http.FileServer(http.FS(subtree))).ServeHTTP(w, r)
}
