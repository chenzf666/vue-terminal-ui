var script = {
  name: "VueTerminalUI",
  data: function () {
    return {
      input: "",
      history: [],
      commandsHistory: [],
      commandsHistoryIndex: 0,
      savedInput: "",
      cursorIndex: 0,
			inputLimit: 255,
			height: 0,
			width: 0,
    };
  },
  props: {
    prefix: {
      type: String,
      default: ""
		},
		initMessage: {
			type: Array,
			default: function () { return []; }
		}
  },
  methods: {
		parseText: function parseText(str) {
			return String(str)
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/ /g, "&nbsp;")
				.replace(/\n/g, "<br>")
				.replace(/((https?:\/\/)|(www\.))(\S+)/gi, function (group) {
					return ("<a href=\"" + (group.startsWith("http") ? group : "//" + group) + "\" target=\"_blank\">" + group + "</a>");
				});
		},
		styleAndColorText: function styleAndColorText(str) {
			var colorHandler = function (str) {
				var colorTagFound = false;
				var colorParsed = str.replace(/\\color:((#[a-f0-9]{6})|(rainbow)|(none));/gi, function (tag) {
					var colorCode = tag.substring(7, tag.length - 1);
					var replaced;
					switch (tag.substring(7, tag.length - 1)) {
						case "rainbow":
							replaced = (colorTagFound) ? "</span><span class='rainbow-text'>" : "<span class='rainbow-text'>";
							break;
						case "none":
							replaced = (colorTagFound) ? "</span>" : "";
							break;
						default:
							replaced = (colorTagFound) ? ("</span><span style=\"color: " + colorCode + ";\">") : ("<span style=\"color: " + colorCode + ";\">");
							break;
					}
					colorTagFound = true;
					return replaced;
				});
				return (colorTagFound) ? colorParsed + "</span>" : colorParsed;
			};
			var styleHandler = function (str) {
				var lastStyleFound;
				var colorParsed = str.replace(/\\style:((bold)|(underline)|(strike)|(italic)|(none));/gi, function (tag) {
					var styleTag;
					switch (tag.substring(7, tag.length - 1)) {
						case "bold":
							styleTag = "strong";
							break;
						case "underline":
							styleTag = "ins";
							break;
						case "strike":
							styleTag = "del";
							break;
						case "italic":
							styleTag = "i";
							break;
						case "none":
							var tmp = lastStyleFound;
							lastStyleFound = null;
							return ("</" + tmp + ">")
					}
					var replaced = (lastStyleFound) ? ("</" + lastStyleFound + "><" + styleTag + ">") : ("<" + styleTag + ">");
					lastStyleFound = styleTag;
					return replaced;
				});
				return (lastStyleFound) ? colorParsed + "</" + lastStyleFound + ">" : colorParsed;
			};
			return colorHandler(styleHandler(str));
		},
    write: function write(content, prefix) {
      var this$1 = this;
      if ( prefix === void 0 ) prefix = false;
      var parsed = this.parseText(content);
      return new Promise(function (res) {
        this$1.history.push({
					prefix: prefix ? this$1.prefix : "",
					content: (prefix ? parsed : this$1.styleAndColorText(parsed)) || "&#8203;"
				});
        res();
      }).then(function () {
        this$1.$refs["text"].scrollIntoView(false);
      });
		},
		multiwrite: function multiwrite(content, replace) {
			var this$1 = this;
			if ( replace === void 0 ) replace = false;
			var writeArray = [];
			for (var i = 0; i < content.length; i++) {
				writeArray.push({
					prefix: "",
					content: this.styleAndColorText(this.parseText(content[i])) || "&#8203;",
				});
			}
			return new Promise(function (res) {
				if (!replace) {
					this$1.history = this$1.history.concat(writeArray);
				} else {
					this$1.history = this$1.history.slice(0, this$1.history.length - writeArray.length - 1).concat(writeArray);
				}
				res();
			}).then(function () {
				this$1.$refs["text"].scrollIntoView(false);
      });
		},
		clearInput: function clearInput() {
			this.write(this.input, true);
			this.updateInput("");
			this.savedInput = "";
      this.commandsHistoryIndex = 0;
			this.setCursor(0);
		},
		sendInput: function sendInput() {
			var savedInput = this.input;
			this.clearInput();
			if (savedInput.trim()) {
				var commandArgs = savedInput.trim().split(/(?<!\\) /g);
				this.commandsHistory.unshift(savedInput);
				this.$emit("triggerCommand", commandArgs[0], commandArgs.splice(1, commandArgs.length));
			}
		},
    paste: function paste(str) {
			var pastedText = str.replace(/\t/g, "");
			this.writeToInput(pastedText);
    },
    setCursor: function setCursor(index, retried) {
      var this$1 = this;
      if ( retried === void 0 ) retried = false;
      var getRef = function (i) {
        return (this$1.$refs[("input-" + i)] && this$1.$refs[("input-" + i)].length) ? this$1.$refs[("input-" + i)][0] : this$1.$refs[("input-" + i)];
			};
      if (!getRef(index)) {
				if (!retried) {
					window.setTimeout(function () {
						this$1.setCursor(index, true);
					}, 5);
				}
				return;
			}
      getRef(this.cursorIndex).className = "";
      getRef(index).className = "cursor";
      this.cursorIndex = index;
		},
		writeToInput: function writeToInput(str) {
			var index =
				this.cursorIndex === 0 ? this.input.length : this.cursorIndex - 1;
			this.updateInput(
				this.input.substring(0, index) +
				str +
				this.input.substring(index, this.input.length)
			);
			this.addToCursor(str.length);
		},
    updateInput: function updateInput(str) {
      this.input = str;
      this.$emit("update:input", str);
    },
    addToCursor: function addToCursor(nb) {
      var predict = this.cursorIndex + nb;
      var newIndex = this.cursorIndex;
      if (this.cursorIndex === 0) {
        newIndex = predict === -1 ? this.input.length : 0;
      }
      else if (predict > this.input.length) {
        newIndex = 0;
      }
      else if (predict < 1) {
        newIndex = 1;
      } else {
        newIndex += nb;
      }
      this.setCursor(newIndex);
    },
    handleKey: function handleKey(e) {
      var this$1 = this;
      var keyCode = e.keyCode;
      var printableKeys =
        (keyCode > 47 && keyCode < 58) ||
        keyCode == 32 ||
        keyCode == 13 ||
        (keyCode > 64 && keyCode < 91) ||
        (keyCode > 95 && keyCode < 112) ||
        (keyCode > 185 && keyCode < 193) ||
				(keyCode > 218 && keyCode < 223);
			if (keyCode === 32) {
				e.preventDefault();
			}
      if (e.ctrlKey && keyCode === 67) {
        this.clearInput();
			}
      else if ((e.metaKey && keyCode === 86) || (e.ctrlKey && keyCode === 86 && navigator.platform === "Win32")) {
        navigator.clipboard.readText().then(function (text) {
          this$1.paste(text);
        });
			}
      else if (e.metaKey) {
        return;
      }
      else if (keyCode === 13) {
        this.sendInput();
      }
      else if (keyCode === 8 || keyCode === 46) {
        var backward = keyCode === 46 ? 0 : 1;
        var index =
          this.cursorIndex === 0
            ? this.input.length
            : this.cursorIndex - backward;
        var str = this.input;
        var part1 = str.substring(0, index - 1);
        var part2 = str.substring(index, str.length);
        this.updateInput(part1 + part2);
        if (this.cursorIndex === 0) {
          this.setCursor(0);
        } else {
          this.addToCursor(-backward);
        }
      }
      else if (keyCode === 37 || keyCode === 39) {
        this.addToCursor(keyCode === 37 ? -1 : 1);
      }
      else if (keyCode === 38) {
				e.preventDefault();
        var length = this.commandsHistory.length;
        if (!length) { return; }
        if (this.commandsHistoryIndex + 1 > length)
          { this.commandsHistoryIndex = length; }
        else { this.commandsHistoryIndex++; }
        this.updateInput(this.commandsHistory[this.commandsHistoryIndex - 1]);
        this.setCursor(0);
      }
      else if (keyCode === 40) {
				e.preventDefault();
        if (this.commandsHistoryIndex - 1 <= 0) {
          this.commandsHistoryIndex = 0;
          this.updateInput(this.savedInput);
        } else
          { this.updateInput(
            this.commandsHistory[--this.commandsHistoryIndex - 1]
          ); }
				this.setCursor(0);
			}
			else if (keyCode === 35) {
				e.preventDefault();
				this.setCursor(0);
			}
			else if (keyCode === 36) {
				e.preventDefault();
				this.setCursor(1);
			}
			else if (keyCode === 9) {
				e.preventDefault();
				this.writeToInput("    ");
			}
      else if (printableKeys) {
				this.writeToInput(e.key);
        if (this.commandsHistoryIndex > 0)
          { this.commandsHistory[this.commandsHistoryIndex - 1] = this.input; }
        else { this.savedInput = this.input; }
      }
    }
  },
  mounted: function mounted() {
    var this$1 = this;
    window.addEventListener("keydown", function (e) {
      this$1.handleKey(e);
    });
    this.$on("write", function (data, overwrite) {
			if ( overwrite === void 0 ) overwrite = false;
			if (Array.isArray(data)) {
				this$1.multiwrite(data, overwrite);
			} else {
				this$1.write(data);
			}
		});
    this.$on("clearHistory", function () {
      this$1.history = [];
		});
		this.$on;
		this.multiwrite(this.initMessage);
	},
};

function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier
, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
  if (typeof shadowMode !== 'boolean') {
    createInjectorSSR = createInjector;
    createInjector = shadowMode;
    shadowMode = false;
  }
  var options = typeof script === 'function' ? script.options : script;
  if (template && template.render) {
    options.render = template.render;
    options.staticRenderFns = template.staticRenderFns;
    options._compiled = true;
    if (isFunctionalTemplate) {
      options.functional = true;
    }
  }
  if (scopeId) {
    options._scopeId = scopeId;
  }
  var hook;
  if (moduleIdentifier) {
    hook = function hook(context) {
      context = context ||
      this.$vnode && this.$vnode.ssrContext ||
      this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext;
      if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
        context = __VUE_SSR_CONTEXT__;
      }
      if (style) {
        style.call(this, createInjectorSSR(context));
      }
      if (context && context._registeredComponents) {
        context._registeredComponents.add(moduleIdentifier);
      }
    };
    options._ssrRegister = hook;
  } else if (style) {
    hook = shadowMode ? function () {
      style.call(this, createInjectorShadow(this.$root.$options.shadowRoot));
    } : function (context) {
      style.call(this, createInjector(context));
    };
  }
  if (hook) {
    if (options.functional) {
      var originalRender = options.render;
      options.render = function renderWithStyleInjection(h, context) {
        hook.call(context);
        return originalRender(h, context);
      };
    } else {
      var existing = options.beforeCreate;
      options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
    }
  }
  return script;
}
var normalizeComponent_1 = normalizeComponent;

var isOldIE = typeof navigator !== 'undefined' && /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());
function createInjector(context) {
  return function (id, style) {
    return addStyle(id, style);
  };
}
var HEAD = document.head || document.getElementsByTagName('head')[0];
var styles = {};
function addStyle(id, css) {
  var group = isOldIE ? css.media || 'default' : id;
  var style = styles[group] || (styles[group] = {
    ids: new Set(),
    styles: []
  });
  if (!style.ids.has(id)) {
    style.ids.add(id);
    var code = css.source;
    if (css.map) {
      code += '\n/*# sourceURL=' + css.map.sources[0] + ' */';
      code += '\n/*# sourceMappingURL=data:application/json;base64,' + btoa(unescape(encodeURIComponent(JSON.stringify(css.map)))) + ' */';
    }
    if (!style.element) {
      style.element = document.createElement('style');
      style.element.type = 'text/css';
      if (css.media) { style.element.setAttribute('media', css.media); }
      HEAD.appendChild(style.element);
    }
    if ('styleSheet' in style.element) {
      style.styles.push(code);
      style.element.styleSheet.cssText = style.styles.filter(Boolean).join('\n');
    } else {
      var index = style.ids.size - 1;
      var textNode = document.createTextNode(code);
      var nodes = style.element.childNodes;
      if (nodes[index]) { style.element.removeChild(nodes[index]); }
      if (nodes.length) { style.element.insertBefore(textNode, nodes[index]); }else { style.element.appendChild(textNode); }
    }
  }
}
var browser = createInjector;

/* script */
var __vue_script__ = script;

/* template */
var __vue_render__ = function() {
  var _vm = this;
  var _h = _vm.$createElement;
  var _c = _vm._self._c || _h;
  return _c("div", { ref: "terminal", staticClass: "vue-terminal-container" }, [
    _c(
      "div",
      {
        ref: "terminal",
        attrs: { id: "terminal" },
        on: {
          keyup: function($event) {
            if (!$event.ctrlKey) {
              return null
            }
            return _vm.handleKey($event)
          }
        }
      },
      [
        _c(
          "div",
          { attrs: { id: "history" } },
          _vm._l(_vm.history, function(obj, key) {
            return _c("div", { key: key, staticClass: "line" }, [
              obj.prefix
                ? _c("span", { staticClass: "prefix" }, [
                    _vm._v(_vm._s(obj.prefix) + " ")
                  ])
                : _vm._e(),
              _vm._v(" "),
              _c("span", { domProps: { innerHTML: _vm._s(obj.content) } })
            ])
          }),
          0
        ),
        _vm._v(" "),
        _c("div", { ref: "text", attrs: { id: "text" } }, [
          _vm.prefix
            ? _c("div", { staticClass: "prefix" }, [
                _vm._v("\n\t\t\t\t" + _vm._s(_vm.prefix) + " \n\t\t\t")
              ])
            : _vm._e(),
          _vm._v(" "),
          _c(
            "div",
            { attrs: { id: "input" } },
            [
              _vm._l(_vm.input, function(char, key) {
                return _c(
                  "span",
                  { key: key, ref: "input-" + (key + 1), refInFor: true },
                  [_vm._v(_vm._s(char === " " ? " " : char))]
                )
              }),
              _vm._v(" "),
              _c("span", { ref: "input-0", staticClass: "cursor" }, [
                _vm._v(" ")
              ])
            ],
            2
          )
        ])
      ]
    )
  ])
};
var __vue_staticRenderFns__ = [];
__vue_render__._withStripped = true;

  /* style */
  var __vue_inject_styles__ = function (inject) {
    if (!inject) { return }
    inject("data-v-4157eff6_0", { source: "\na {\n\tcolor: inherit;\n}\n.vue-terminal-container {\n  position: absolute;\n  height: 100vh;\n  top: 0;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  overflow: auto;\n}\n#terminal {\n  height: 100%;\n  overflow-x: hidden;\n  background-color: #292a35;\n  color: #fff;\n  font-family: monospace;\n  padding: 0;\n  margin: 0;\n}\n.prefix {\n  float: left;\n}\n#input,\n.line {\n  word-break: break-all;\n  min-height: 1.2em;\n}\nlabel {\n  display: inline-block;\n}\nsection {\n  margin: 2rem 0;\n}\n#input .cursor {\n  background: #c7c7c7;\n  color: #111;\n  animation-name: blip;\n  animation-duration: 1s; \n  animation-iteration-count: infinite;\n}\n.rainbow-text {\n\tbackground: repeating-linear-gradient(85deg, red, orange, yellow, lime, cyan, purple, violet, red);\n\ttext-align: center;\n\tbackground-size: 300% 300%;\n\t-webkit-background-clip: text;\n\t-webkit-text-fill-color: transparent;\n\tanimation: rainbow 3s linear 0s infinite;\n}\n@keyframes blip {\n0%, 49% {\n\t\tcolor: #111;\n\t\tbackground: #c7c7c7;\n}\n50%, 100% {\n\t\tbackground: inherit;\n\t\tcolor: #fff;\n}\n}\n@keyframes rainbow {\n0% {\n    background-position: 0% 0%;\n}\n50% {\n    background-position: 75% 0%;\n}\n100% {\n\t\tbackground-position: 150% 0%;\n}\n}\n", map: {"version":3,"sources":["/mnt/e/Project/git/vue-terminal-ui/src/VueTerminalUI.vue"],"names":[],"mappings":";AAoaA;CACA,cAAA;AACA;AAEA;EACA,kBAAA;EACA,aAAA;EACA,MAAA;EACA,SAAA;EACA,OAAA;EACA,QAAA;EACA,cAAA;AACA;AAEA;EACA,YAAA;EACA,kBAAA;EACA,yBAAA;EACA,WAAA;EACA,sBAAA;EACA,UAAA;EACA,SAAA;AACA;AAEA;EACA,WAAA;AACA;AAEA;;EAEA,qBAAA;EACA,iBAAA;AACA;AAEA;EACA,qBAAA;AACA;AAEA;EACA,cAAA;AACA;AAEA;EACA,mBAAA;EACA,WAAA;EACA,oBAAA;EACA,sBAAA;EACA,mCAAA;AACA;AAEA;CACA,kGAAA;CACA,kBAAA;CACA,0BAAA;CACA,6BAAA;CACA,oCAAA;CACA,wCAAA;AACA;AAEA;AACA;EACA,WAAA;EACA,mBAAA;AACA;AACA;EACA,mBAAA;EACA,WAAA;AACA;AACA;AAEA;AACA;IACA,0BAAA;AACA;AACA;IACA,2BAAA;AACA;AACA;EACA,4BAAA;AACA;AACA","file":"VueTerminalUI.vue","sourcesContent":["<template>\n\t<div\n\t\tclass=\"vue-terminal-container\"\n\t\tref=\"terminal\">\n\t\t<div\n\t\t\tid=\"terminal\"\n\t\t\t@keyup.ctrl=\"handleKey\"\n\t\t\tref=\"terminal\">\n\t\t\t<!-- History -->\n\t\t\t<div id=\"history\">\n\t\t\t\t<div\n\t\t\t\t\tv-for=\"(obj, key) in history\"\n\t\t\t\t\t:key=\"key\"\n\t\t\t\t\tclass=\"line\">\n\t\t\t\t\t<span\n\t\t\t\t\t\tv-if=\"obj.prefix\"\n\t\t\t\t\t\tclass=\"prefix\">{{ obj.prefix }}&nbsp;</span>\n\t\t\t\t\t<span v-html=\"obj.content\" />\n\t\t\t\t</div>\n\t\t\t</div>\n\n\t\t\t<!-- Bottom -->\n\t\t\t<div\n\t\t\t\tid=\"text\"\n\t\t\t\tref=\"text\">\n\t\t\t\t<div\n\t\t\t\t\tv-if=\"prefix\"\n\t\t\t\t\tclass=\"prefix\">\n\t\t\t\t\t{{ prefix }}&nbsp;\n\t\t\t\t</div>\n\n\t\t\t\t<div id=\"input\">\n\t\t\t\t\t<span\n\t\t\t\t\t\tv-for=\"(char, key) in input\"\n\t\t\t\t\t\t:key=\"key\"\n\t\t\t\t\t\t:ref=\"`input-${key + 1}`\"\n\t\t\t\t\t\tclass>{{ (char === \" \") ? \"&nbsp;\" : char }}</span>\n\t\t\t\t\t<span\n\t\t\t\t\t\tref=\"input-0\"\n\t\t\t\t\t\tclass=\"cursor\">&nbsp;</span>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</template>\n\n\n<script>\nexport default {\n  //\n  // Name\n  //\n  name: \"VueTerminalUI\",\n\n  //\n  // Data\n  //\n  data: () => {\n    return {\n      input: \"\",\n      history: [],\n      commandsHistory: [],\n      commandsHistoryIndex: 0,\n      savedInput: \"\",\n      cursorIndex: 0,\n\t\t\tinputLimit: 255,\n\t\t\theight: 0,\n\t\t\twidth: 0,\n    };\n  },\n\n  //\n  // Props\n  //\n  props: {\n    prefix: {\n      type: String,\n      default: \"\"\n\t\t},\n\t\tinitMessage: {\n\t\t\ttype: Array,\n\t\t\tdefault: () => []\n\t\t}\n  },\n\n  //\n  // Methods\n  //\n  methods: {\n\t\tparseText(str) {\n\t\t\treturn String(str)\n        .replace(/</g, \"&lt;\")\n        .replace(/>/g, \"&gt;\")\n        .replace(/ /g, \"&nbsp;\")\n\t\t\t\t.replace(/\\n/g, \"<br>\")\n\t\t\t\t.replace(/((https?:\\/\\/)|(www\\.))(\\S+)/gi, (group) => {\n\t\t\t\t\treturn `<a href=\"${group.startsWith(\"http\") ? group : \"//\" + group}\" target=\"_blank\">${group}</a>`;\n\t\t\t\t});\n\t\t},\n\n\t\tstyleAndColorText(str) {\n\t\t\tconst colorHandler = (str) => {\n\t\t\t\tlet colorTagFound = false;\n\n\t\t\t\tlet colorParsed = str.replace(/\\\\color:((#[a-f0-9]{6})|(rainbow)|(none));/gi, (tag) => {\n\t\t\t\t\tlet colorCode = tag.substring(7, tag.length - 1);\n\t\t\t\t\tlet replaced;\n\n\t\t\t\t\tswitch (tag.substring(7, tag.length - 1)) {\n\t\t\t\t\t\tcase \"rainbow\":\n\t\t\t\t\t\t\treplaced = (colorTagFound) ? `</span><span class='rainbow-text'>` : `<span class='rainbow-text'>`;\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase \"none\":\n\t\t\t\t\t\t\treplaced = (colorTagFound) ? \"</span>\" : \"\";\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tdefault:\n\t\t\t\t\t\t\treplaced = (colorTagFound) ? `</span><span style=\"color: ${colorCode};\">` : `<span style=\"color: ${colorCode};\">`;\n\t\t\t\t\t\t\tbreak; \n\t\t\t\t\t}\n\t\t\t\t\tcolorTagFound = true;\n\t\t\t\t\treturn replaced;\n\t\t\t\t});\n\n\t\t\t\treturn (colorTagFound) ? colorParsed + \"</span>\" : colorParsed;\n\t\t\t};\n\n\t\t\tconst styleHandler = (str) => {\n\t\t\t\tlet lastStyleFound;\n\n\t\t\t\tlet colorParsed = str.replace(/\\\\style:((bold)|(underline)|(strike)|(italic)|(none));/gi, (tag) => {\n\t\t\t\t\tlet styleTag;\n\n\t\t\t\t\tswitch (tag.substring(7, tag.length - 1)) {\n\t\t\t\t\t\tcase \"bold\":\n\t\t\t\t\t\t\tstyleTag = \"strong\";\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase \"underline\":\n\t\t\t\t\t\t\tstyleTag = \"ins\";\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase \"strike\":\n\t\t\t\t\t\t\tstyleTag = \"del\";\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase \"italic\":\n\t\t\t\t\t\t\tstyleTag = \"i\";\n\t\t\t\t\t\t\tbreak;\n\t\t\t\t\t\tcase \"none\":\n\t\t\t\t\t\t\tvar tmp = lastStyleFound;\n\t\t\t\t\t\t\tlastStyleFound = null;\n\t\t\t\t\t\t\treturn `</${tmp}>`\n\t\t\t\t\t}\n\t\t\t\t\tlet replaced = (lastStyleFound) ? `</${lastStyleFound}><${styleTag}>` : `<${styleTag}>`;\n\t\t\t\t\tlastStyleFound = styleTag;\n\t\t\t\t\treturn replaced;\n\t\t\t\t});\n\n\t\t\t\treturn (lastStyleFound) ? colorParsed + `</${lastStyleFound}>` : colorParsed;\n\t\t\t};\n\t\t\treturn colorHandler(styleHandler(str));\n\t\t},\n\n    write(content, prefix = false) {\n      let parsed = this.parseText(content);\n\n      return new Promise(res => {\n        this.history.push({\n\t\t\t\t\tprefix: prefix ? this.prefix : \"\",\n\t\t\t\t\tcontent: (prefix ? parsed : this.styleAndColorText(parsed)) || \"&#8203;\"\n\t\t\t\t});\n        res();\n      }).then(() => {\n        this.$refs[\"text\"].scrollIntoView(false);\n      });\n\t\t},\n\n\t\tmultiwrite(content, replace = false) {\n\t\t\tlet writeArray = [];\n\t\t\tfor (let i = 0; i < content.length; i++) {\n\t\t\t\twriteArray.push({\n\t\t\t\t\tprefix: \"\",\n\t\t\t\t\tcontent: this.styleAndColorText(this.parseText(content[i])) || \"&#8203;\",\n\t\t\t\t});\n\t\t\t}\n\n\t\t\treturn new Promise(res => {\n\t\t\t\tif (!replace) {\n\t\t\t\t\tthis.history = this.history.concat(writeArray);\n\t\t\t\t} else {\n\t\t\t\t\tthis.history = this.history.slice(0, this.history.length - writeArray.length - 1).concat(writeArray);\n\t\t\t\t}\n\t\t\t\tres();\n\t\t\t}).then(() => {\n\t\t\t\tthis.$refs[\"text\"].scrollIntoView(false);\n      });\n\t\t},\n\t\t\n\t\tclearInput() {\n\t\t\tthis.write(this.input, true);\n\t\t\tthis.updateInput(\"\");\n\t\t\tthis.savedInput = \"\";\n      this.commandsHistoryIndex = 0;\n\t\t\tthis.setCursor(0);\n\t\t},\n\n\t\tsendInput() {\n\t\t\tlet savedInput = this.input;\n\t\t\tthis.clearInput();\n\n\t\t\tif (savedInput.trim()) {\n\t\t\t\tlet commandArgs = savedInput.trim().split(/(?<!\\\\) /g);\n\t\t\t\tthis.commandsHistory.unshift(savedInput);\n\t\t\t\tthis.$emit(\"triggerCommand\", commandArgs[0], commandArgs.splice(1, commandArgs.length));\n\t\t\t}\n\t\t},\n\n    paste(str) {\n\t\t\tlet pastedText = str.replace(/\\t/g, \"\");\n\n      // if (this.input.length >= this.inputLimit) return;\n      // if (this.input.length + pastedText.length >= this.inputLimit)\n\t\t\t// \tpastedText = pastedText.substring(0, this.inputLimit - this.input.length);\n\n\t\t\tthis.writeToInput(pastedText);\n    },\n\n    setCursor(index, retried = false) {\n      const getRef = i => {\n        return (this.$refs[`input-${i}`] && this.$refs[`input-${i}`].length) ? this.$refs[`input-${i}`][0] : this.$refs[`input-${i}`];\n\t\t\t};\n\t\t\t\n      if (!getRef(index)) {\n\t\t\t\tif (!retried) {\n\t\t\t\t\twindow.setTimeout(() => {\n\t\t\t\t\t\tthis.setCursor(index, true);\n\t\t\t\t\t}, 5);\n\t\t\t\t}\n\t\t\t\treturn;\n\t\t\t}\n\n      getRef(this.cursorIndex).className = \"\";\n      getRef(index).className = \"cursor\";\n      this.cursorIndex = index;\n\t\t},\n\t\t\n\t\twriteToInput(str) {\n\t\t\tlet index =\n\t\t\t\tthis.cursorIndex === 0 ? this.input.length : this.cursorIndex - 1;\n\t\t\tthis.updateInput(\n\t\t\t\tthis.input.substring(0, index) +\n\t\t\t\tstr +\n\t\t\t\tthis.input.substring(index, this.input.length)\n\t\t\t);\n\t\t\tthis.addToCursor(str.length);\n\t\t},\n\n    updateInput(str) {\n      this.input = str;\n      this.$emit(\"update:input\", str);\n    },\n\n    addToCursor(nb) {\n      let predict = this.cursorIndex + nb;\n      let newIndex = this.cursorIndex;\n\n      // If at the of the initial position\n      if (this.cursorIndex === 0) {\n        newIndex = predict === -1 ? this.input.length : 0;\n      }\n      // If at the end of input then go to the initial cursor index\n      else if (predict > this.input.length) {\n        newIndex = 0;\n      }\n      // If at the beggining of the input, stays here\n      else if (predict < 1) {\n        newIndex = 1;\n      } else {\n        newIndex += nb;\n      }\n\n      this.setCursor(newIndex);\n    },\n\n    handleKey(e) {\n      const keyCode = e.keyCode;\n      const printableKeys =\n        (keyCode > 47 && keyCode < 58) || // number keys\n        keyCode == 32 ||\n        keyCode == 13 || // spacebar & return key(s) (if you want to allow carriage returns)\n        (keyCode > 64 && keyCode < 91) || // letter keys\n        (keyCode > 95 && keyCode < 112) || // numpad keys\n        (keyCode > 185 && keyCode < 193) || // ;=,-./` (in order)\n\t\t\t\t(keyCode > 218 && keyCode < 223); // [\\]' (in order)\n\n\t\t\t// space\n\t\t\tif (keyCode === 32) {\n\t\t\t\te.preventDefault();\n\t\t\t}\n\n      // ctrl-C\n      if (e.ctrlKey && keyCode === 67) {\n        this.clearInput();\n\t\t\t}\n      // meta-V or ctrl-V for windows users\n      else if ((e.metaKey && keyCode === 86) || (e.ctrlKey && keyCode === 86 && navigator.platform === \"Win32\")) {\n        navigator.clipboard.readText().then(text => {\n          this.paste(text);\n        });\n\t\t\t}\n      // meta-C\n      else if (e.metaKey) {\n        return;\n      }\n      // Enter\n      else if (keyCode === 13) {\n        this.sendInput();\n      }\n      // Backspace\n      else if (keyCode === 8 || keyCode === 46) {\n        let backward = keyCode === 46 ? 0 : 1;\n        let index =\n          this.cursorIndex === 0\n            ? this.input.length\n            : this.cursorIndex - backward;\n        let str = this.input;\n        let part1 = str.substring(0, index - 1);\n        let part2 = str.substring(index, str.length);\n        this.updateInput(part1 + part2);\n\n        if (this.cursorIndex === 0) {\n          this.setCursor(0);\n        } else {\n          this.addToCursor(-backward);\n        }\n      }\n      // Arrow left/right\n      else if (keyCode === 37 || keyCode === 39) {\n        this.addToCursor(keyCode === 37 ? -1 : 1);\n      }\n      // Arrow up\n      else if (keyCode === 38) {\n\t\t\t\te.preventDefault();\n        let length = this.commandsHistory.length;\n        if (!length) return;\n        if (this.commandsHistoryIndex + 1 > length)\n          this.commandsHistoryIndex = length;\n        else this.commandsHistoryIndex++;\n        this.updateInput(this.commandsHistory[this.commandsHistoryIndex - 1]);\n        this.setCursor(0);\n      }\n      // Arrow down\n      else if (keyCode === 40) {\n\t\t\t\te.preventDefault();\n        if (this.commandsHistoryIndex - 1 <= 0) {\n          this.commandsHistoryIndex = 0;\n          this.updateInput(this.savedInput);\n        } else\n          this.updateInput(\n            this.commandsHistory[--this.commandsHistoryIndex - 1]\n          );\n\t\t\t\tthis.setCursor(0);\n\t\t\t}\n\t\t\t// End\n\t\t\telse if (keyCode === 35) {\n\t\t\t\te.preventDefault();\n\t\t\t\tthis.setCursor(0);\n\t\t\t}\n\t\t\t// Home\n\t\t\telse if (keyCode === 36) {\n\t\t\t\te.preventDefault();\n\t\t\t\tthis.setCursor(1);\n\t\t\t}\n\t\t\t// Tab\n\t\t\telse if (keyCode === 9) {\n\t\t\t\t// To do :\n\t\t\t\t// Make a better tabulation integration\n\t\t\t\te.preventDefault();\n\t\t\t\tthis.writeToInput(\"    \"); //\n\t\t\t}\n      // Printable keys (a,b,c ...)\n      else if (printableKeys) {\n        // if (this.input.length >= this.inputLimit) return;\n\t\t\t\tthis.writeToInput(e.key);\n        if (this.commandsHistoryIndex > 0)\n          this.commandsHistory[this.commandsHistoryIndex - 1] = this.input;\n        else this.savedInput = this.input;\n      }\n    }\n  },\n\n  //\n  // Mounted\n  //\n  mounted() {\n    window.addEventListener(\"keydown\", e => {\n      this.handleKey(e);\n    });\n\n    this.$on(\"write\", (data, overwrite = false) => {\n\t\t\tif (Array.isArray(data)) {\n\t\t\t\tthis.multiwrite(data, overwrite);\n\t\t\t} else {\n\t\t\t\tthis.write(data);\n\t\t\t}\n\t\t});\n\n    this.$on(\"clearHistory\", () => {\n      this.history = [];\n\t\t});\n\n\t\tthis.$on\n\t\t\n\t\tthis.multiwrite(this.initMessage);\n\t},\n\n\t// watch: {\n\t// \tthis.$refs.terminal.clientHeight\n\t// }\n};\n</script>\n\n<style>\na {\n\tcolor: inherit;\n}\n\n.vue-terminal-container {\n  position: absolute;\n  height: 100vh;\n  top: 0;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  overflow: auto;\n}\n\n#terminal {\n  height: 100%;\n  overflow-x: hidden;\n  background-color: #292a35;\n  color: #fff;\n  font-family: monospace;\n  padding: 0;\n  margin: 0;\n}\n\n.prefix {\n  float: left;\n}\n\n#input,\n.line {\n  word-break: break-all;\n  min-height: 1.2em;\n}\n\nlabel {\n  display: inline-block;\n}\n\nsection {\n  margin: 2rem 0;\n}\n\n#input .cursor {\n  background: #c7c7c7;\n  color: #111;\n  animation-name: blip;\n  animation-duration: 1s; \n  animation-iteration-count: infinite;\n}\n\n.rainbow-text {\n\tbackground: repeating-linear-gradient(85deg, red, orange, yellow, lime, cyan, purple, violet, red);\n\ttext-align: center;\n\tbackground-size: 300% 300%;\n\t-webkit-background-clip: text;\n\t-webkit-text-fill-color: transparent;\n\tanimation: rainbow 3s linear 0s infinite;\n}\n\n@keyframes blip {\n  0%, 49% {\n\t\tcolor: #111;\n\t\tbackground: #c7c7c7;\n\t}\n  50%, 100% {\n\t\tbackground: inherit;\n\t\tcolor: #fff;\n\t}\n}\n\n@keyframes rainbow {\n\t0% {\n    background-position: 0% 0%;\n\t}\n\t50% {\n    background-position: 75% 0%;\n\t}\n\t100% {\n\t\tbackground-position: 150% 0%;\n\t}\n}\n</style>\n"]}, media: undefined });

  };
  /* scoped */
  var __vue_scope_id__ = undefined;
  /* module identifier */
  var __vue_module_identifier__ = undefined;
  /* functional template */
  var __vue_is_functional_template__ = false;
  /* style inject SSR */
  

  
  var VueTerminalUI = normalizeComponent_1(
    { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
    __vue_inject_styles__,
    __vue_script__,
    __vue_scope_id__,
    __vue_is_functional_template__,
    __vue_module_identifier__,
    browser,
    undefined
  );

function install(Vue) {
	if (install.installed) { return; }
	install.installed = true;
	Vue.component("vue-terminal-ui", VueTerminalUI);
}
var plugin = {
	install: install,
};
var GlobalVue = null;
if (typeof window !== "undefined") {
	GlobalVue = window.Vue;
} else if (typeof global !== "undefined") {
	GlobalVue = global.Vue;
}
if (GlobalVue) {
	GlobalVue.use(plugin);
}

export default VueTerminalUI;
export { install };
