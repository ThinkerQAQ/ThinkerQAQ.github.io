package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/bridge"
	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/social"
	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/tools/blogctl/social/buffer"
)

func (a app) runSocial(args []string) error {
	if len(args) == 0 {
		return errors.New("usage: blogctl social <channels|source|create|list|show|approve|stage|publish>")
	}
	sub := args[0]
	flags := flag.NewFlagSet("social "+sub, flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	id := flags.String("id", "", "local social draft id")
	input := flags.String("input", "", "JSON draft input file")
	revision := flags.String("revision", "", "reviewed content revision")
	platform := flags.String("platform", "", "linkedin, twitter, or bluesky")
	kind := flags.String("kind", "article", "source type")
	slug := flags.String("slug", "", "content source slug")
	contentRoot := flags.String("content-root", "", "BlogContent checkout")
	if err := flags.Parse(args[1:]); err != nil {
		return err
	}
	dataRoot, err := bridge.ConfigDir()
	if err != nil {
		return err
	}
	config := bridge.ResolvedSocialConfig()
	client := buffer.Client{APIKey: config.Buffer.APIKey}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	show := func(value any) error {
		encoder := json.NewEncoder(a.out)
		encoder.SetIndent("", "  ")
		return encoder.Encode(value)
	}
	resolve := func(src social.Source) (social.Source, error) {
		root := strings.TrimSpace(*contentRoot)
		if root == "" {
			root = os.Getenv("BLOGCTL_CONTENT_ROOT")
		}
		if root == "" {
			cwd, _ := os.Getwd()
			root = findAncestor(cwd, isContentRoot)
		}
		if root == "" {
			return social.Source{}, errors.New("content repository not found: specify --content-root or BLOGCTL_CONTENT_ROOT")
		}
		search, err := bridge.ResolvedSearchRuntimeConfig()
		if err != nil {
			return social.Source{}, err
		}
		return social.ResolveSource(root, search.Site.Origin, src)
	}
	switch sub {
	case "channels":
		channels, err := client.Channels(ctx)
		if err != nil {
			return err
		}
		return show(channels)
	case "source":
		source, err := resolve(social.Source{Kind: *kind, Slug: *slug, Language: "en"})
		if err != nil {
			return err
		}
		return show(source)
	case "create":
		if *input == "" {
			return errors.New("--input is required")
		}
		raw, err := os.ReadFile(*input)
		if err != nil {
			return err
		}
		var incoming social.DraftInput
		if err := json.Unmarshal(raw, &incoming); err != nil {
			return err
		}
		incoming.Source, err = resolve(incoming.Source)
		if err != nil {
			return err
		}
		draft, err := social.Create(dataRoot, incoming)
		if err != nil {
			return err
		}
		return show(draft)
	case "list":
		drafts, err := social.List(dataRoot)
		if err != nil {
			return err
		}
		return show(drafts)
	case "show":
		draft, err := social.Load(dataRoot, *id)
		if err != nil {
			return err
		}
		return show(draft)
	case "approve":
		draft, err := social.Load(dataRoot, *id)
		if err != nil {
			return err
		}
		if *revision == "" || *revision != draft.Revision {
			return errors.New("revision mismatch; review the current draft before approval")
		}
		draft.ApprovedRevision = draft.Revision
		if err := social.Save(dataRoot, draft); err != nil {
			return err
		}
		return show(draft)
	case "stage", "publish":
		if *platform == "" {
			return errors.New("--platform is required")
		}
		draft, err := social.Load(dataRoot, *id)
		if err != nil {
			return err
		}
		post, ok := draft.Posts[*platform]
		if !ok {
			return fmt.Errorf("no %s content in draft", *platform)
		}
		if !draft.Ready() || *revision != draft.Revision {
			return errors.New("draft is not approved for this exact revision")
		}
		channels, err := client.Channels(ctx)
		if err != nil {
			return err
		}
		var ch buffer.Channel
		for _, candidate := range channels {
			if candidate.Service == *platform {
				if ch.ID != "" {
					return errors.New("multiple matching channels; explicit channel selection is required")
				}
				ch = candidate
			}
		}
		if ch.ID == "" {
			return fmt.Errorf("%s is not connected to Buffer", *platform)
		}
		if ch.IsDisconnected || ch.IsLocked {
			return fmt.Errorf("%s channel is not available", *platform)
		}
		state := draft.Remote[*platform]
		if sub == "stage" {
			if state.ID != "" || state.State != "" {
				return fmt.Errorf("%s has already been staged or has an unresolved write; do not retry blindly", *platform)
			}
			state = social.Remote{ChannelID: ch.ID, State: "creating"}
			draft.Remote[*platform] = state
			if err := social.Save(dataRoot, draft); err != nil {
				return err
			}
			remote, err := client.CreateDraft(ctx, buffer.PostPayload{ChannelID: ch.ID, Text: social.RenderText(draft.Source.URL, *platform, post), ImageURL: post.MediaURL})
			if err != nil {
				return fmt.Errorf("remote outcome uncertain; inspect Buffer before retry: %w", err)
			}
			state.ID = remote.ID
			state.State = "draft"
			if remote.Status != "draft" || remote.ChannelID != ch.ID {
				state.State = "uncertain"
				state.Error = "unexpected Buffer create status"
			}
			draft.Remote[*platform] = state
			if err := social.Save(dataRoot, draft); err != nil {
				return err
			}
			if state.State != "draft" {
				return fmt.Errorf("created Buffer post %s but status is unexpected: %s", remote.ID, remote.Status)
			}
			return show(draft)
		}
		// Publication never creates a remote post. It only transitions a verified Buffer draft.
		if state.State != "draft" || state.ID == "" || state.ChannelID != ch.ID {
			return errors.New("no verified Buffer draft available to publish")
		}
		remote, err := client.Post(ctx, state.ID)
		if err != nil {
			return err
		}
		if remote.ChannelID != ch.ID || remote.Status != "draft" || remote.Text != social.RenderText(draft.Source.URL, *platform, post) {
			return errors.New("Buffer remote draft differs from reviewed content; publication refused")
		}
		state.State = "publishing"
		draft.Remote[*platform] = state
		if err := social.Save(dataRoot, draft); err != nil {
			return err
		}
		result, err := client.PublishDraft(ctx, state.ID)
		if err != nil {
			return fmt.Errorf("publish outcome uncertain; inspect Buffer before retry: %w", err)
		}
		state.State = "submitted"
		if result.Status == "sent" {
			state.State = "sent"
		}
		draft.Remote[*platform] = state
		if err := social.Save(dataRoot, draft); err != nil {
			return err
		}
		return show(draft)
	default:
		return fmt.Errorf("unknown social command %q", sub)
	}
}
