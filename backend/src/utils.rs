/// Build a file URL. When `backend_url` is empty, returns a root-relative path
/// (e.g. `/uploads/avatars/file.jpg`) so nginx can proxy it regardless of the
/// host/IP used to reach the server.
pub fn make_file_url(backend_url: &str, path: &str) -> String {
    let path = path.trim_start_matches('/');
    if backend_url.is_empty() {
        format!("/{}", path)
    } else {
        format!("{}/{}", backend_url.trim_end_matches('/'), path)
    }
}
