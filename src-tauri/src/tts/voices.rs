use serde::Serialize;

pub const SAMPLE_TEXT: &str = "En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo.";

pub const PREFERRED_NEURAL: &[&str] = &[
    "es-AR-ElenaNeural",
    "es-AR-TomasNeural",
    "es-ES-ElviraNeural",
    "es-ES-AlvaroNeural",
    "es-MX-DaliaNeural",
    "es-MX-JorgeNeural",
    "es-US-PalomaNeural",
    "es-US-AlonsoNeural",
];

#[derive(Debug, Serialize)]
pub struct NeuralVoice {
    pub id: String,
    pub name: String,
    pub locale: String,
    pub gender: String,
    pub source: &'static str,
}

fn preferred_fallback() -> Vec<NeuralVoice> {
    PREFERRED_NEURAL
        .iter()
        .map(|id| {
            let locale = id.split('-').take(2).collect::<Vec<_>>().join("-");
            NeuralVoice {
                id: (*id).to_string(),
                name: (*id).to_string(),
                locale,
                gender: String::new(),
                source: "neural",
            }
        })
        .collect()
}

/// Lista preferida (offline-friendly). Si hay red, se enriquece desde MS Edge.
pub fn list_neural_voices() -> Vec<NeuralVoice> {
    match std::panic::catch_unwind(try_list_edge_voices) {
        Ok(Ok(v)) if !v.is_empty() => v,
        _ => preferred_fallback(),
    }
}

fn try_list_edge_voices() -> Result<Vec<NeuralVoice>, String> {
    let voices = msedge_tts::voice::get_voices_list().map_err(|e| e.to_string())?;
    let mut out: Vec<NeuralVoice> = voices
        .into_iter()
        .filter(|v| {
            v.locale
                .as_deref()
                .unwrap_or("")
                .to_lowercase()
                .starts_with("es")
        })
        .map(|v| {
            let short = v
                .short_name
                .clone()
                .unwrap_or_else(|| v.name.clone());
            NeuralVoice {
                id: short.clone(),
                name: v.friendly_name.unwrap_or(short),
                locale: v.locale.unwrap_or_default(),
                gender: v.gender.unwrap_or_default(),
                source: "neural",
            }
        })
        .collect();

    out.sort_by_key(|v| {
        let pref = PREFERRED_NEURAL
            .iter()
            .position(|p| *p == v.id)
            .unwrap_or(99);
        (pref, v.locale.clone(), v.name.clone())
    });
    Ok(out)
}
