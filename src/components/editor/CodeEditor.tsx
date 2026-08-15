"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { html as htmlLang } from "@codemirror/lang-html";
import { css as cssLang } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";

export type CodeLanguage = "html" | "css" | "javascript";

interface CodeEditorProps {
  value: string;
  language: CodeLanguage;
  onChange: (value: string) => void;
}

const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0b0d11",
      color: "#d6d6d6",
      height: "100%",
      fontSize: "13px",
    },
    ".cm-content": {
      fontFamily: "'SF Mono', 'Cascadia Code', Consolas, monospace",
      padding: "8px 0",
    },
    ".cm-gutters": {
      backgroundColor: "#0b0d11",
      color: "#3b4252",
      border: "none",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.035)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(255,255,255,0.035)" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "rgba(99, 120, 255, 0.28)",
    },
    ".cm-cursor": { borderLeftColor: "#e0e0e0" },
    "&.cm-focused": { outline: "none" },
    ".cm-tooltip": {
      backgroundColor: "#16181d",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "#d6d6d6",
    },
    ".cm-scroller": {
      fontFamily: "'SF Mono', 'Cascadia Code', Consolas, monospace",
    },
  },
  { dark: true }
);

export function CodeEditor({ value, language, onChange }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const langExtension =
      language === "html"
        ? htmlLang()
        : language === "css"
          ? cssLang()
          : javascript();

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          langExtension,
          darkTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the document in sync when the value changes externally (e.g. loading
  // a project) without destroying the editor instance.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
}