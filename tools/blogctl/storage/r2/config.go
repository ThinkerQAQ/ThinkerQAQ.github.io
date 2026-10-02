package r2

import (
	"errors"
	"net/url"
	"strings"
)

type Config struct {
	AccessKeyID     string `json:"accessKeyId,omitempty" toml:"access_key_id"`
	SecretAccessKey string `json:"secretAccessKey,omitempty" toml:"secret_access_key"`
	AccountID       string `json:"accountId,omitempty" toml:"account_id"`
	Endpoint        string `json:"endpoint,omitempty" toml:"endpoint"`
	Bucket          string `json:"bucket,omitempty" toml:"bucket"`
	PublicBaseURL   string `json:"publicBaseUrl" toml:"public_base_url"`
}

func IsConfigured(config Config) bool {
	endpoint := strings.TrimSpace(config.Endpoint)
	if endpoint == "" && strings.TrimSpace(config.AccountID) != "" {
		endpoint = "https://" + strings.TrimSpace(config.AccountID) + ".r2.cloudflarestorage.com"
	}
	return strings.TrimSpace(config.AccessKeyID) != "" &&
		strings.TrimSpace(config.SecretAccessKey) != "" &&
		strings.TrimSpace(config.Bucket) != "" &&
		endpoint != "" &&
		strings.TrimSpace(config.PublicBaseURL) != ""
}

func NormalizeConfig(config Config) (Config, error) {
	config.AccessKeyID = strings.TrimSpace(config.AccessKeyID)
	config.SecretAccessKey = strings.TrimSpace(config.SecretAccessKey)
	config.AccountID = strings.TrimSpace(config.AccountID)
	config.Endpoint = strings.TrimRight(strings.TrimSpace(config.Endpoint), "/")
	config.Bucket = strings.TrimSpace(config.Bucket)
	config.PublicBaseURL = strings.TrimSpace(config.PublicBaseURL)

	if config.Endpoint == "" && config.AccountID != "" {
		config.Endpoint = "https://" + config.AccountID + ".r2.cloudflarestorage.com"
	}
	if config.Endpoint != "" {
		endpoint, err := url.Parse(config.Endpoint)
		if err != nil || endpoint.Scheme != "https" || endpoint.Host == "" {
			return Config{}, errors.New("R2 endpoint must be a valid HTTPS URL")
		}
		if endpoint.RawQuery != "" || endpoint.Fragment != "" || (endpoint.Path != "" && endpoint.Path != "/") {
			return Config{}, errors.New("R2 endpoint must not contain a path, query, or fragment")
		}
	}
	if config.PublicBaseURL != "" {
		publicBase, err := url.Parse(config.PublicBaseURL)
		if err != nil || publicBase.Scheme != "https" || publicBase.Host == "" {
			return Config{}, errors.New("R2 public base URL must be a valid HTTPS URL")
		}
		if publicBase.RawQuery != "" || publicBase.Fragment != "" {
			return Config{}, errors.New("R2 public base URL must not contain a query or fragment")
		}
	}
	return config, nil
}

func ResolveConfig(config Config) (Config, error) {
	config, err := NormalizeConfig(config)
	if err != nil {
		return Config{}, err
	}
	switch {
	case config.AccessKeyID == "":
		return Config{}, errors.New("R2 access key ID is required")
	case config.SecretAccessKey == "":
		return Config{}, errors.New("R2 secret access key is required")
	case config.Bucket == "":
		return Config{}, errors.New("R2 bucket is required")
	case config.Endpoint == "":
		return Config{}, errors.New("R2 endpoint or account ID is required")
	case config.PublicBaseURL == "":
		return Config{}, errors.New("R2 public base URL is required")
	}
	return config, nil
}
