// editor.js — CodeMirror adapter for the lesson code box. Wraps one
// CodeMirror instance built from the #code textarea and exposes the small
// interface lesson1.js needs, so CodeMirror stays isolated here.

let cm = null;
let singleLine = false;
let onSubmit = () => {};
let onChange = () => {};
let _enabled = true, _readonly = false;
let _hintShown = false;

function applyReadonly() {
  // disabled (between steps) wins over the watchword read-only state
  const ro = !_enabled ? "nocursor" : (_readonly ? true : false);
  cm.setOption("readOnly", ro);
  cm.getWrapperElement().classList.toggle("cm-disabled", !_enabled);
}

export const Editor = {
  init(opts = {}) {
    onSubmit = opts.onSubmit || (() => {});
    onChange = opts.onChange || (() => {});
    const ta = document.getElementById("code");
    cm = CodeMirror.fromTextArea(ta, {
      mode: "python",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      smartIndent: true,
      lineWrapping: false,
      viewportMargin: Infinity, // grow to fit content
      extraKeys: {
        Enter: () => { if (singleLine) { onSubmit(); return; } return CodeMirror.Pass; },
        "Shift-Enter": (cm2) => cm2.execCommand("newlineAndIndent"),
      },
    });
    cm.setSize("100%", "auto");
    cm.on("change", () => onChange(cm.lineCount()));
  },
  refresh() { if (cm) setTimeout(() => cm.refresh(), 70); }, // after the panel moves/appears (CodeMirror mis-measures while hidden)
  getValue() { return cm ? cm.getValue() : ""; },
  setValue(str) { if (cm) cm.setValue(str || ""); },
  focus() { if (cm) cm.focus(); },
  setSingleLine(b) { singleLine = !!b; },
  setPlaceholder(str) { if (cm) cm.setOption("placeholder", str || ""); },
  setHint(str) { if (cm) { cm.setOption("placeholder", str || ""); _hintShown = true; } },
  clearHint() { if (cm) { cm.setOption("placeholder", ""); _hintShown = false; } },
  toggleHint(str) { if (_hintShown) this.clearHint(); else this.setHint(str); },
  setEnabled(b) { if (cm) { _enabled = !!b; applyReadonly(); } },
  setReadOnly(b) { if (cm) { _readonly = !!b; applyReadonly(); } },
};
