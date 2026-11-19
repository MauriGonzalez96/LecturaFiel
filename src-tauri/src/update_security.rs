//! Validación de URLs de actualización (anti-tampering / open-redirect).

const ALLOWED_HOSTS: &[&str] = &[
    "github.com",
    "objects.githubusercontent.com",
    "release-assets.githubusercontent.com",
    "github-releases.githubusercontent.com",
];

pub fn is_allowed_update_url(url: &str) -> bool {
    let Ok(parsed) = url::Url::parse(url) else {
        return false;
    };
    if parsed.scheme() != "https" {
        return false;
    }
    let Some(host) = parsed.host_str() else {
        return false;
    };
    let host = host.to_ascii_lowercase();
    let host_ok = ALLOWED_HOSTS.iter().any(|h| host == *h)
        || host.ends_with(".githubusercontent.com");
    if !host_ok {
        return false;
    }
    let path = parsed.path().to_ascii_lowercase();
    if !path.ends_with(".exe") {
        return false;
    }
    if path.contains("..") {
        return false;
    }
    if host == "github.com" && !path.contains("/releases/download/") {
        return false;
    }
    true
}

pub fn safe_installer_file_name(url: &str) -> String {
    let fallback = "Lektor-Setup.exe".to_string();
    let Ok(parsed) = url::Url::parse(url) else {
        return fallback;
    };
    let Some(last) = parsed
        .path_segments()
        .and_then(|mut s| s.next_back())
        .map(|s| s.to_string())
    else {
        return fallback;
    };
    let cleaned: String = last
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        .collect();
    if cleaned.to_ascii_lowercase().ends_with(".exe")
        && cleaned.len() > 4
        && !cleaned.contains("..")
    {
        cleaned
    } else {
        fallback
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_github_release_exe() {
        assert!(is_allowed_update_url(
            "https://github.com/MauriGonzalez96/Lektor/releases/download/v4.0.2/Lektor_4.0.2_x64-setup.exe"
        ));
    }

    #[test]
    fn accepts_objects_githubusercontent() {
        assert!(is_allowed_update_url(
            "https://objects.githubusercontent.com/github-production-release-asset-2e65be/123/abc.exe"
        ));
    }

    #[test]
    fn rejects_http() {
        assert!(!is_allowed_update_url(
            "http://github.com/MauriGonzalez96/Lektor/releases/download/v1/x.exe"
        ));
    }

    #[test]
    fn rejects_foreign_host_substring_trick() {
        assert!(!is_allowed_update_url(
            "https://evil.com/githubusercontent.com/payload.exe"
        ));
        assert!(!is_allowed_update_url(
            "https://githubusercontent.com.evil.com/payload.exe"
        ));
    }

    #[test]
    fn rejects_non_exe() {
        assert!(!is_allowed_update_url(
            "https://github.com/MauriGonzalez96/Lektor/releases/download/v1/notes.txt"
        ));
    }

    #[test]
    fn rejects_github_outside_releases_download() {
        // Tras normalizar ../, queda fuera de /releases/download/
        assert!(!is_allowed_update_url(
            "https://github.com/MauriGonzalez96/Lektor/../evil.exe"
        ));
        assert!(!is_allowed_update_url(
            "https://github.com/MauriGonzalez96/Lektor/archive/refs/heads/main.zip.exe"
        ));
        assert!(!is_allowed_update_url("https://evil.example/x.exe"));
    }

    #[test]
    fn sanitizes_installer_name() {
        assert_eq!(
            safe_installer_file_name(
                "https://github.com/o/r/releases/download/v1/Lektor_4.0.2_x64-setup.exe"
            ),
            "Lektor_4.0.2_x64-setup.exe"
        );
        assert_eq!(
            safe_installer_file_name(
                "https://github.com/o/r/releases/download/v1/..%2F..%2Fevil.exe"
            ),
            "Lektor-Setup.exe"
        );
    }
}
