//! Prashnottar native shell. The UI is the bundled web build (../web/dist);
//! it talks to the API server over HTTPS (PUBLIC_API_BASE baked in at build time).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Opens checkout, WhatsApp and policy links in the system browser/app.
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running Prashnottar");
}
