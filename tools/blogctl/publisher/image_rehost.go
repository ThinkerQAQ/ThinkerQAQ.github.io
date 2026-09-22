package publisher

import (
	"context"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
)

type RehostImage struct {
	Source      string
	Payload     []byte
	ContentType string
}

type ImageRehostOptions struct {
	Platform       string
	SourceDir      string
	FailOpenRemote bool
	AlreadyHosted  func(string) bool
}

type ImageRehostUploader func(context.Context, RehostImage) (string, error)

func isRemoteHTTPImage(source string) bool {
	parsed, err := url.Parse(strings.TrimSpace(source))
	return err == nil && (parsed.Scheme == "https" || parsed.Scheme == "http") && parsed.Host != ""
}

func rehostImageReplacements(
	ctx context.Context,
	client *http.Client,
	markdown string,
	options ImageRehostOptions,
	upload ImageRehostUploader,
) (map[string]string, error) {
	replacements := map[string]string{}
	for _, source := range imageSources(markdown) {
		if options.AlreadyHosted != nil && options.AlreadyHosted(source) {
			continue
		}
		payload, contentType, err := loadImage(client, source, options.SourceDir)
		if err != nil {
			wrapped := platformError(ErrUpload, options.Platform, "download-image", 0, err.Error(), true)
			if options.FailOpenRemote && isRemoteHTTPImage(source) {
				slog.Warn("platform image download failed; keeping remote image URL",
					"platform", options.Platform, "source", source, "error", wrapped)
				continue
			}
			return nil, wrapped
		}
		target, err := upload(ctx, RehostImage{
			Source:      source,
			Payload:     payload,
			ContentType: contentType,
		})
		if err != nil {
			if options.FailOpenRemote && isRemoteHTTPImage(source) {
				slog.Warn("platform image rehost failed; keeping remote image URL",
					"platform", options.Platform, "source", source, "error", err)
				continue
			}
			return nil, err
		}
		target = strings.TrimSpace(target)
		if target == "" {
			err := platformError(ErrUpload, options.Platform, "image-upload", 0, "image URL missing", false)
			if options.FailOpenRemote && isRemoteHTTPImage(source) {
				slog.Warn("platform image rehost returned no URL; keeping remote image URL",
					"platform", options.Platform, "source", source)
				continue
			}
			return nil, err
		}
		replacements[source] = target
	}
	return replacements, nil
}

func rehostMarkdownImages(
	ctx context.Context,
	client *http.Client,
	input DraftInput,
	options ImageRehostOptions,
	upload ImageRehostUploader,
) (string, error) {
	if options.SourceDir == "" {
		options.SourceDir = input.SourceDir
	}
	replacements, err := rehostImageReplacements(ctx, client, input.Markdown, options, upload)
	if err != nil {
		return "", err
	}
	return replaceImages(input.Markdown, replacements), nil
}

func rehostHTMLImages(
	ctx context.Context,
	client *http.Client,
	input DraftInput,
	html string,
	options ImageRehostOptions,
	upload ImageRehostUploader,
) (string, error) {
	if options.SourceDir == "" {
		options.SourceDir = input.SourceDir
	}
	replacements, err := rehostImageReplacements(ctx, client, input.Markdown, options, upload)
	if err != nil {
		return "", err
	}
	return replaceImages(html, replacements), nil
}
