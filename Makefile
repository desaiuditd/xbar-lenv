PLUGIN_NAME := lenv.10m.ts
XBAR_PATH := ~/Library/Application\ Support/xbar/plugins

link-to-xbar:
	rm -rf $(XBAR_PATH)/$(PLUGIN_NAME)
	ln -s $(PWD)/index.ts $(XBAR_PATH)/$(PLUGIN_NAME)
	chmod +x $(XBAR_PATH)/$(PLUGIN_NAME)
