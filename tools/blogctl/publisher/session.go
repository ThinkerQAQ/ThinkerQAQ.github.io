package publisher

import (
	"errors"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"time"
)

func HTTPClientForSession(base *http.Client, session Session) (*http.Client, error) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	for _, cookie := range session.Cookies {
		if strings.TrimSpace(cookie.Name) == "" || cookie.Value == "" {
			continue
		}
		host := strings.TrimPrefix(strings.TrimSpace(cookie.Domain), ".")
		if host == "" {
			continue
		}
		path := cookie.Path
		if path == "" {
			path = "/"
		}
		scheme := "http"
		if cookie.Secure {
			scheme = "https"
		}
		seed := &url.URL{Scheme: scheme, Host: host, Path: path}
		value := &http.Cookie{
			Name:     cookie.Name,
			Value:    cookie.Value,
			Path:     path,
			Secure:   cookie.Secure,
			HttpOnly: cookie.HTTPOnly,
		}
		if !cookie.HostOnly {
			value.Domain = cookie.Domain
		}
		if cookie.ExpirationDate != nil {
			seconds, fraction := mathModf(*cookie.ExpirationDate)
			value.Expires = time.Unix(int64(seconds), int64(fraction*1e9))
			if value.Expires.Before(now) {
				continue
			}
		}
		jar.SetCookies(seed, []*http.Cookie{value})
	}
	if len(session.Cookies) == 0 {
		return nil, errors.New("browser session contains no cookies")
	}
	if base == nil {
		base = http.DefaultClient
	}
	clone := *base
	clone.Jar = jar
	return &clone, nil
}

func mathModf(value float64) (float64, float64) {
	whole := float64(int64(value))
	return whole, value - whole
}
