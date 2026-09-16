package bridge

import "testing"

func TestFilterMediumCookies(t *testing.T) {
	got := filterMediumCookies([]browserCookie{
		{Name: "sid", Value: "secret"},
		{Name: "xsrf", Value: "token"},
		{Name: "unrelated", Value: "drop"},
	})
	if len(got) != 2 || got["sid"] != "secret" || got["xsrf"] != "token" {
		t.Fatalf("cookies = %#v", got)
	}
}

func TestStripMediumXSSI(t *testing.T) {
	input := ")]}'while(1);</x>\n{\"success\":true}"
	if got := stripMediumXSSI(input); got != `{"success":true}` {
		t.Fatalf("got %q", got)
	}
	plain := `{"success":true}`
	if got := stripMediumXSSI(plain); got != plain {
		t.Fatalf("plain response changed to %q", got)
	}
}
