package main

import (
	"fmt"
	"os"

	"github.com/ThinkerQAQ/ThinkerQAQ.github.io/devcontrol"
	"github.com/thinkerqaq/devtool/sdk/project"
)

func main() {
	provider := &devcontrol.Provider{}
	if err := project.Serve(provider); err != nil {
		fmt.Fprintln(os.Stderr, "project.blogctl:", err)
		os.Exit(1)
	}
}
