//! Motor léxico mínimo en Rust (base para WASM).
//! Fase actual: tokenización + normalización.
//! La detección/sustitución completa se irá portando desde TypeScript.

use serde::{Deserialize, Serialize};
use unicode_normalization::UnicodeNormalization;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Token {
    pub raw: String,
    pub normalized: String,
    pub is_word: bool,
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStats {
    pub words_analyzed: usize,
    pub candidates_found: usize,
    pub rarity_detected: usize,
    pub substituted: usize,
    pub glossary_only: usize,
    pub preserved_literary: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineOutput {
    pub original_text: String,
    pub adapted_text: String,
    pub chapter: u32,
    pub stats: PipelineStats,
    pub note: String,
}

/// Normaliza forma (minúsculas sin diacríticos).
pub fn normalize_form(word: &str) -> String {
    word.nfd()
        .filter(|c| !unicode_normalization::char::is_combining_mark(*c))
        .collect::<String>()
        .to_lowercase()
        .trim_matches(|c: char| {
            matches!(
                c,
                '«' | '»' | '"' | '\'' | '‘' | '’' | '.' | ',' | ';' | ':' | '!' | '?' | '…'
            )
        })
        .to_string()
}

fn is_word_char(ch: char) -> bool {
    ch.is_alphanumeric() || ch == '\'' || ch == '-' || ch == '’'
}

/// Tokeniza texto en palabras / no-palabras.
pub fn tokenize(text: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let chars: Vec<(usize, char)> = text.char_indices().collect();
    if chars.is_empty() {
        return tokens;
    }

    let mut i = 0usize;
    while i < chars.len() {
        let (byte_start, ch) = chars[i];
        let wordish = is_word_char(ch);
        let mut j = i + 1;
        while j < chars.len() && is_word_char(chars[j].1) == wordish {
            j += 1;
        }
        let byte_end = if j < chars.len() {
            chars[j].0
        } else {
            text.len()
        };
        let raw = text[byte_start..byte_end].to_string();
        let normalized = if wordish {
            normalize_form(&raw)
        } else {
            raw.clone()
        };
        tokens.push(Token {
            raw,
            normalized,
            is_word: wordish,
            start: byte_start,
            end: byte_end,
        });
        i = j;
        let _ = ch;
    }
    tokens
}

/// Stub de pipeline: identidad (cablear WASM; lógica completa después).
pub fn run_pipeline_stub(text: &str, chapter: u32) -> PipelineOutput {
    let tokens = tokenize(text);
    let words = tokens.iter().filter(|t| t.is_word).count();
    PipelineOutput {
        original_text: text.to_string(),
        adapted_text: text.to_string(),
        chapter,
        stats: PipelineStats {
            words_analyzed: words,
            candidates_found: 0,
            rarity_detected: 0,
            substituted: 0,
            glossary_only: 0,
            preserved_literary: 0,
        },
        note: "Rust stub: tokeniza; sustitución aún en TypeScript/Worker".into(),
    }
}

#[cfg(target_arch = "wasm32")]
mod wasm_api {
    use super::*;
    use wasm_bindgen::prelude::*;

    #[wasm_bindgen]
    pub fn wasm_tokenize(text: &str) -> JsValue {
        serde_wasm_bindgen::to_value(&tokenize(text)).unwrap_or(JsValue::NULL)
    }

    #[wasm_bindgen]
    pub fn wasm_run_pipeline_stub(text: &str, chapter: u32) -> JsValue {
        serde_wasm_bindgen::to_value(&run_pipeline_stub(text, chapter))
            .unwrap_or(JsValue::NULL)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_accents() {
        assert_eq!(normalize_form("Planificación"), "planificacion");
    }

    #[test]
    fn tokenizes_words() {
        let t = tokenize("Hola, mundo.");
        assert!(t.iter().any(|x| x.is_word && x.normalized == "hola"));
        assert!(t.iter().any(|x| x.is_word && x.normalized == "mundo"));
    }
}
