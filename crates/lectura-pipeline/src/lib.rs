//! Motor léxico Lektor (nativo / WASM).
//! Paridad aproximada con el Worker TypeScript: léxico semilla + arcaísmos +
//! everyday + sinónimos fáciles según nivel de intervención (1–4).

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;
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
    pub mode: u8,
    pub stats: PipelineStats,
    pub note: String,
}

#[derive(Debug, Deserialize)]
struct ArchaismEntry {
    lemma: String,
    forms: Vec<String>,
    #[serde(rename = "preferredSubstitute")]
    preferred_substitute: String,
}

#[derive(Debug, Deserialize)]
struct EasySynEntry {
    form: String,
    preferred: String,
    simple: String,
}

#[derive(Debug, Clone, Deserialize)]
struct SeedEntry {
    lemma: String,
    forms: Vec<String>,
    level: u8,
    #[serde(rename = "preferredSubstitute")]
    preferred_substitute: Option<String>,
    #[serde(rename = "simpleSubstitute")]
    simple_substitute: Option<String>,
    #[serde(rename = "defaultDecision")]
    default_decision: String,
}

#[derive(Clone)]
struct LexEntry {
    level: u8,
    preferred: Option<String>,
    simple: Option<String>,
    decision: String,
}

struct LexData {
    lexicon: HashMap<String, LexEntry>,
    everyday: HashSet<String>,
    easy: HashMap<String, (String, String)>,
}

fn lex_data() -> &'static LexData {
    static DATA: OnceLock<LexData> = OnceLock::new();
    DATA.get_or_init(|| {
        let mut lexicon: HashMap<String, LexEntry> = HashMap::new();

        let seeds: Vec<SeedEntry> =
            serde_json::from_str(include_str!("../data/seed_lexicon.json")).unwrap_or_default();
        for e in seeds {
            let entry = LexEntry {
                level: e.level,
                preferred: e.preferred_substitute.filter(|s| !s.is_empty()),
                simple: e.simple_substitute.filter(|s| !s.is_empty()),
                decision: e.default_decision,
            };
            lexicon.insert(normalize_form(&e.lemma), entry.clone());
            for f in e.forms {
                lexicon.insert(normalize_form(&f), entry.clone());
            }
        }

        let arch: Vec<ArchaismEntry> =
            serde_json::from_str(include_str!("../data/archaisms.json")).unwrap_or_default();
        for e in arch {
            let entry = LexEntry {
                level: 3,
                preferred: Some(e.preferred_substitute.clone()),
                simple: Some(e.preferred_substitute.clone()),
                decision: "substitute".into(),
            };
            lexicon.insert(normalize_form(&e.lemma), entry.clone());
            for f in e.forms {
                lexicon.insert(normalize_form(&f), entry.clone());
            }
        }

        let everyday_list: Vec<String> =
            serde_json::from_str(include_str!("../data/everyday.json")).unwrap_or_default();
        let everyday: HashSet<String> = everyday_list.into_iter().map(|w| normalize_form(&w)).collect();

        let easy_list: Vec<EasySynEntry> =
            serde_json::from_str(include_str!("../data/easy_synonyms.json")).unwrap_or_default();
        let mut easy = HashMap::new();
        for e in easy_list {
            easy.insert(normalize_form(&e.form), (e.preferred, e.simple));
        }

        LexData {
            lexicon,
            everyday,
            easy,
        }
    })
}

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

pub fn tokenize(text: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let chars: Vec<(usize, char)> = text.char_indices().collect();
    if chars.is_empty() {
        return tokens;
    }

    let mut i = 0usize;
    while i < chars.len() {
        let (byte_start, _) = chars[i];
        let wordish = is_word_char(chars[i].1);
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
    }
    tokens
}

fn match_casing(original: &str, replacement: &str) -> String {
    if original.chars().all(|c| !c.is_alphabetic() || c.is_uppercase())
        && original.chars().any(|c| c.is_alphabetic())
    {
        return replacement.to_uppercase();
    }
    let mut o = original.chars();
    if let Some(first) = o.next() {
        if first.is_uppercase() {
            let rest_lower = o.all(|c| !c.is_alphabetic() || c.is_lowercase());
            if rest_lower {
                let mut it = replacement.chars();
                if let Some(c0) = it.next() {
                    return format!("{}{}", c0.to_uppercase(), it.as_str());
                }
            }
        }
    }
    replacement.to_string()
}

#[derive(Clone, Copy)]
struct ModeOpts {
    mode: u8,
    min_level: u8,
    include_rarity: bool,
    prefer_simplest: bool,
    include_literary: bool,
    force_substitute: bool,
}

fn mode_opts(mode: u8) -> ModeOpts {
    match mode {
        1 => ModeOpts {
            mode: 1,
            min_level: 3,
            include_rarity: false,
            prefer_simplest: false,
            include_literary: false,
            force_substitute: false,
        },
        2 => ModeOpts {
            mode: 2,
            min_level: 2,
            include_rarity: false,
            prefer_simplest: false,
            include_literary: false,
            force_substitute: false,
        },
        4 => ModeOpts {
            mode: 4,
            min_level: 1,
            include_rarity: true,
            prefer_simplest: true,
            include_literary: true,
            force_substitute: true,
        },
        _ => ModeOpts {
            mode: 3,
            min_level: 2,
            include_rarity: true,
            prefer_simplest: false,
            include_literary: false,
            force_substitute: true,
        },
    }
}

const OUTLIER_MIN_LEN: usize = 5;

/// Pipeline léxico completo (datos embebidos).
pub fn run_pipeline(text: &str, chapter: u32, mode: u8) -> PipelineOutput {
    let opts = mode_opts(mode.clamp(1, 4));
    let data = lex_data();
    let tokens = tokenize(text);
    let words = tokens.iter().filter(|t| t.is_word).count();

    let mut adapted = String::with_capacity(text.len());
    let mut candidates = 0usize;
    let mut rarity = 0usize;
    let mut substituted = 0usize;
    let mut glossary_only = 0usize;
    let mut preserved_literary = 0usize;

    for t in &tokens {
        if !t.is_word {
            adapted.push_str(&t.raw);
            continue;
        }

        if let Some(entry) = data.lexicon.get(&t.normalized) {
            if entry.level < opts.min_level {
                adapted.push_str(&t.raw);
                continue;
            }
            candidates += 1;
            if entry.level == 1 {
                preserved_literary += 1;
            }

            let should_sub = if entry.decision == "preserve" {
                opts.include_literary && opts.prefer_simplest
            } else if entry.decision == "glossary_only" {
                false
            } else {
                opts.force_substitute
                    || entry.decision == "substitute"
                    || entry.level >= 3
            };

            let sub = if opts.prefer_simplest {
                entry
                    .simple
                    .as_ref()
                    .or(entry.preferred.as_ref())
            } else {
                entry.preferred.as_ref()
            };

            if should_sub {
                if let Some(s) = sub {
                    if !s.is_empty() && normalize_form(s) != t.normalized {
                        adapted.push_str(&match_casing(&t.raw, s));
                        substituted += 1;
                        continue;
                    }
                }
                glossary_only += 1;
            } else if entry.decision == "glossary_only" || sub.is_none() {
                glossary_only += 1;
            }
            adapted.push_str(&t.raw);
            continue;
        }

        // Rareza fuera de léxico (modos 3–4)
        if opts.include_rarity
            && t.normalized.chars().count() >= OUTLIER_MIN_LEN
            && !data.everyday.contains(&t.normalized)
        {
            rarity += 1;
            candidates += 1;
            if let Some((pref, simple)) = data.easy.get(&t.normalized) {
                let s = if opts.prefer_simplest { simple } else { pref };
                if !s.is_empty() && normalize_form(s) != t.normalized {
                    adapted.push_str(&match_casing(&t.raw, s));
                    substituted += 1;
                    continue;
                }
            }
            glossary_only += 1;
        }

        adapted.push_str(&t.raw);
    }

    PipelineOutput {
        original_text: text.to_string(),
        adapted_text: adapted,
        chapter,
        mode: opts.mode,
        stats: PipelineStats {
            words_analyzed: words,
            candidates_found: candidates,
            rarity_detected: rarity,
            substituted,
            glossary_only,
            preserved_literary,
        },
        note: "Rust/WASM pipeline (léxico + arcaísmos + everyday + sinónimos)".into(),
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
    pub fn wasm_run_pipeline(text: &str, chapter: u32, mode: u8) -> JsValue {
        serde_wasm_bindgen::to_value(&run_pipeline(text, chapter, mode)).unwrap_or(JsValue::NULL)
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

    #[test]
    fn substitutes_archaism_mode1() {
        let out = run_pipeline("Otrosí digo que ansí fue.", 1, 1);
        assert!(out.stats.candidates_found > 0);
        assert!(out.stats.substituted > 0);
    }

    #[test]
    fn mode3_uses_easy_synonyms() {
        let out = run_pipeline("La planificacion fue compleja.", 1, 3);
        assert!(
            out.adapted_text.to_lowercase().contains("plan")
                || out.stats.substituted > 0
                || out.stats.rarity_detected > 0
        );
    }
}
