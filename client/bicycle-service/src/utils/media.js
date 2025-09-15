const ORIGIN = process.env.REACT_APP_API_ORIGIN || 'http://localhost:5000';

export function mediaUrl(path) {
    if (!path) return '';
    // если уже полный URL — не трогаем
    if (/^https?:\/\//i.test(path)) return path;
    // нормализуем, чтобы не было двойных слешей
    return `${ORIGIN}${path.startsWith('/') ? path : '/' + path}`;
}
