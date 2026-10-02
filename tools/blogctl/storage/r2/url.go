package r2

import (
	"errors"
	"net/url"
	"strings"
)

func encodePath(value string) string {
	parts := strings.Split(strings.ReplaceAll(value, "\\", "/"), "/")
	for index, part := range parts {
		parts[index] = url.PathEscape(part)
	}
	return strings.Join(parts, "/")
}

func normalizeObjectKey(objectKey string) (string, error) {
	objectKey = strings.TrimSpace(strings.TrimPrefix(strings.ReplaceAll(objectKey, "\\", "/"), "/"))
	if objectKey == "" {
		return "", errors.New("R2 object key is required")
	}
	return objectKey, nil
}

func PublicURL(config Config, objectKey string) (string, error) {
	resolved, err := NormalizeConfig(config)
	if err != nil {
		return "", err
	}
	if resolved.PublicBaseURL == "" {
		return "", errors.New("R2 public base URL is required")
	}
	objectKey, err = normalizeObjectKey(objectKey)
	if err != nil {
		return "", err
	}
	base, _ := url.Parse(resolved.PublicBaseURL)
	if !strings.HasSuffix(base.Path, "/") {
		base.Path += "/"
	}
	relative, err := url.Parse(encodePath(objectKey))
	if err != nil {
		return "", err
	}
	return base.ResolveReference(relative).String(), nil
}
