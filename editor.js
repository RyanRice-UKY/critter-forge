// editor.js — CodeMirror adapter for the lesson code box. Wraps one
// CodeMirror instance built from the #code textarea and exposes the small
// interface lesson1.js needs, so CodeMirror stays isolated here.

let cm = null;
let singleLine = false;
let onSubmit = () => {};
let _enabled = true, _readonly = false;

function applyReadonly() {
  // disabled (between steps) wins over the watchword read-only state
  const ro = !_enabled ? "nocursor" : (_readonly ? true : false);
  cm.setOption("readOnly", ro);
  cm.getWrapperElement().classList.toggle("cm-disabled", !_enabled);
}

export const Editor = {
  init(opts = {}) {
    onSubmit = opts.onSubmit || (() => {});
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
        "Shift-Enter": (editor) => editor.replaceSelection("\n"),
      },
    });
    cm.setSize("100%", "auto");
  },
  getValue() { return cm ? cm.getValue() : ""; },
  setValue(str) { if (cm) cm.setValue(str || ""); },
  focus() { if (cm) cm.focus(); },
  setSingleLine(b) { singleLine = !!b; },
  setPlaceholder(str) { if (cm) cm.setOption("placeholder", str || ""); },
  setEnabled(b) { if (cm) { _enabled = !!b; applyReadonly(); } },
  setReadOnly(b) { if (cm) { _readonly = !!b; applyReadonly(); } },
};
