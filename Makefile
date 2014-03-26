test:
	@./node_modules/.bin/mocha -r should -R spec

lint:
	@jshint test *.js

.PHONY: test lint lint-changed
