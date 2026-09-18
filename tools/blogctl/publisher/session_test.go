package publisher

import (
	"net/http"
	"net/url"
	"testing"
	"time"
)

func TestHTTPClientForSessionPreservesCookieDomainAndPath(t *testing.T) {
	future := float64(time.Now().Add(time.Hour).Unix())
	client, err := HTTPClientForSession(&http.Client{}, Session{
		Cookies: []BrowserCookie{
			{
				Name: "root", Value: "root-value", Domain: ".juejin.cn", Path: "/",
				Secure: true, ExpirationDate: &future,
			},
			{
				Name: "api-only", Value: "api-value", Domain: "api.juejin.cn", Path: "/content_api/",
				Secure: true, HostOnly: true, ExpirationDate: &future,
			},
		},
	})
	if err != nil {
		t.Fatal(err)
	}

	apiURL, _ := url.Parse("https://api.juejin.cn/content_api/v1/article_draft/create")
	apiCookies := client.Jar.Cookies(apiURL)
	values := map[string]string{}
	for _, cookie := range apiCookies {
		values[cookie.Name] = cookie.Value
	}
	if values["root"] != "root-value" || values["api-only"] != "api-value" {
		t.Fatalf("api cookies = %#v", values)
	}

	userURL, _ := url.Parse("https://api.juejin.cn/user_api/v1/user/get")
	userCookies := client.Jar.Cookies(userURL)
	values = map[string]string{}
	for _, cookie := range userCookies {
		values[cookie.Name] = cookie.Value
	}
	if values["root"] != "root-value" {
		t.Fatalf("user cookies = %#v", values)
	}
	if _, ok := values["api-only"]; ok {
		t.Fatalf("path-scoped cookie leaked to user_api: %#v", values)
	}
}

func TestHTTPClientForSessionDropsExpiredCookies(t *testing.T) {
	past := float64(time.Now().Add(-time.Hour).Unix())
	client, err := HTTPClientForSession(&http.Client{}, Session{
		Cookies: []BrowserCookie{{
			Name: "expired", Value: "secret", Domain: ".juejin.cn", Path: "/",
			Secure: true, ExpirationDate: &past,
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	target, _ := url.Parse("https://api.juejin.cn/")
	if got := client.Jar.Cookies(target); len(got) != 0 {
		t.Fatalf("expired cookies = %#v", got)
	}
}
