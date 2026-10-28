# Видеофоны погодного сайта

Футажи — иллюстрации состояния и сезона, а не веб-камеры выбранного города.
Все файлы хранятся локально; при показе страницы обращения к Pexels не нужны.

## Лицензия

Источник: [Pexels License](https://www.pexels.com/license/), проверено 29 октября 2026.
Лицензия разрешает бесплатное использование фото и видео на сайтах и их изменение.
Указание автора не обязательно, но авторы и источники сохранены ниже.
Футажи используются как часть интерфейса приложения, не перепродаются как отдельный сток
и не обозначают поддержку проекта авторами.

## Подготовка файлов

Каждый клип обрезан до 8 секунд, приведён к 960×540, 24 fps, H.264, yuv420p.
Аудиодорожки удалены, MP4 оптимизированы `+faststart`. JPEG-постер извлечён
из соответствующего обработанного видео. Постер используется при уменьшенной
анимации, запрете autoplay или ошибке воспроизведения.

Команда обработки (START и NAME указаны в карточках):

```bash
ffmpeg -ss START -i original.mp4 -t 8 \
  -vf "scale=960:540:force_original_aspect_ratio=increase,crop=960:540,fps=24" \
  -c:v libx264 -preset fast -crf 26 -pix_fmt yuv420p \
  -an -movflags +faststart NAME.mp4
ffmpeg -ss 1 -i NAME.mp4 -frames:v 1 -q:v 3 NAME.jpg
```

Для `night.mp4` использован CRF 25 для сохранения деталей звёздного неба.
Видео можно повторять через `loop`; склейка не претендует на бесшовный студийный луп.
Промежуточные оригиналы в репозиторий не включены.

## Источники и контрольные суммы

### `spring.mp4` / `spring.jpg`

- Автор: George Morina.
- Название: Trees in the Park.
- Страница: [Trees in the Park](https://www.pexels.com/video/trees-in-the-park-4127990/).
- Скачанный вариант: https://videos.pexels.com/video-files/4127990/4127990-hd_1920_1080_30fps.mp4
- Начало фрагмента: 0.5 сек.; длительность результата: 8 сек.
- Размер видео и постера: 2,273,624 байт.
- SHA-256 MP4: `ca8fef72a057196665923c6f70b318737d2b7325917b6c0ba25864f2da6e8028`.
- SHA-256 JPEG: `5ac827b01140f2a33c95148666509676e5246163649ae857963b054602f63c38`.

### `summer.mp4` / `summer.jpg`

- Автор: Lucas Pezeta.
- Название: Drone Footage Of A Forest Partially Shaded From The Sun By Clouds Shadow.
- Страница: [Drone Footage Of A Forest Partially Shaded From The Sun By Clouds Shadow](https://www.pexels.com/video/drone-footage-of-a-forest-partially-shaded-from-the-sun-by-clouds-shadow-3192999/).
- Скачанный вариант: https://videos.pexels.com/video-files/3192999/3192999-hd_1920_1080_30fps.mp4
- Начало фрагмента: 2 сек.; длительность результата: 8 сек.
- Размер видео и постера: 1,426,099 байт.
- SHA-256 MP4: `40b82872b77c00d8ce29b47131c96c1afe7a37ca21485cd0262586ff30519e16`.
- SHA-256 JPEG: `298f22876cc07ac37da3583298d301263facff4531968a75d05c5aeba44d3d36`.

### `autumn.mp4` / `autumn.jpg`

- Автор: Giorgi Chkhaidze.
- Название: A River in the Forest.
- Страница: [A River in the Forest](https://www.pexels.com/video/a-river-in-the-forest-9945131/).
- Скачанный вариант: https://videos.pexels.com/video-files/9945131/9945131-hd_1920_1080_24fps.mp4
- Начало фрагмента: 1 сек.; длительность результата: 8 сек.
- Размер видео и постера: 764,237 байт.
- SHA-256 MP4: `fe23d444672b2c8adcfc7e609165a471120904d3a439d90495fc84ec771f17a4`.
- SHA-256 JPEG: `374d69367d737261338c06c3ce3fb9c30cb5b1b07a90acd8f9d11395a0773e17`.

### `winter.mp4` / `winter.jpg`

- Автор: Matthias Groeneveld.
- Название: Video of a Forest with Snow.
- Страница: [Video of a Forest with Snow](https://www.pexels.com/video/video-of-a-forest-with-snow-6943631/).
- Скачанный вариант: https://videos.pexels.com/video-files/6943631/6943631-hd_1920_1080_30fps.mp4
- Начало фрагмента: 2 сек.; длительность результата: 8 сек.
- Размер видео и постера: 1,193,402 байт.
- SHA-256 MP4: `8a1dffe3917289e56c13359de3a303f33a399234cc191ae5f8747a0a38af4c0c`.
- SHA-256 JPEG: `0a1ef4a889df80c7684ff188fad7affa0be385ca67892f2202d154797dc94aaf`.

### `rain.mp4` / `rain.jpg`

- Автор: Martina Tomšič.
- Название: A View of the Forest Through a Wet Glass Window.
- Страница: [A View of the Forest Through a Wet Glass Window](https://www.pexels.com/video/a-view-of-the-forest-through-a-wet-glass-window-4151509/).
- Скачанный вариант: https://videos.pexels.com/video-files/4151509/4151509-hd_1920_1080_30fps.mp4
- Начало фрагмента: 1 сек.; длительность результата: 8 сек.
- Размер видео и постера: 1,002,968 байт.
- SHA-256 MP4: `d016c9f165038046bc5db163b1969717ba575d59c75478e246cf0cfef5de0d49`.
- SHA-256 JPEG: `3bcbb98c7385c1b4a162e6b72b31a0fc17600bf770b6364748fda5e625e5de3d`.

### `night.mp4` / `night.jpg`

- Автор: Postcard Pictures.
- Название: Starry Night Time Lapse.
- Страница: [Starry Night Time Lapse](https://www.pexels.com/video/starry-night-time-lapse-5884322/).
- Скачанный вариант: https://videos.pexels.com/video-files/5884322/5884322-hd_1920_1080_24fps.mp4
- Начало фрагмента: 1 сек.; длительность результата: 8 сек.
- Размер видео и постера: 1,477,591 байт.
- SHA-256 MP4: `ae43227059014dfc2822593d8fe6c938c5af8f7e41dd728111c9447ba0834996`.
- SHA-256 JPEG: `57b9159bf045513b5de6bf8b1ee31336bc9a5cef338e814d4f1b8b2ffb0ee773`.

## Выбор фона

- Ясный день: сезонный клип spring/summer/autumn/winter.
- Снег: winter, независимо от календарного сезона.
- Дождь, морось, гроза: rain; ночью можно дополнительно затемнить.
- Ясная ночь: night. Для облаков и тумана подходят сезонный фон и цветовой слой.
- Для южного полушария календарные сезоны сдвигаются на шесть месяцев.

Итого MP4 и JPEG: 8,137,921 байт (7.76 MiB).
Технические параметры проверены ffprobe, постеры осмотрены визуально.

## WebM VP9 и совместимость браузеров

Основной вариант воспроизведения — WebM VP9; MP4 H.264 сохранён как fallback.
Это устраняет зависимость от наличия H.264-декодера в сборке браузера.
Постеры JPEG используются при reduced-motion, запрете autoplay или ошибке обоих кодеков.
Все WebM получены из уже перечисленных лицензированных MP4 без изменения источников.

```bash
ffmpeg -i NAME.mp4 -c:v libvpx-vp9 -b:v 0 -crf 36 \
  -cpu-used 5 -row-mt 1 -threads 2 -an NAME.webm
```

- `spring.webm`: 2,851,055 байт; SHA-256 `f91d815c920f959e1c2793562c53642f30118d5f08d7509a315eb28f88b1d40a`.
- `summer.webm`: 1,153,109 байт; SHA-256 `fc6f5d8615a7d6d132585968af2f828c7b18f5c9f2e86191486b69b16fd301f1`.
- `autumn.webm`: 478,866 байт; SHA-256 `c072506248563799c506c6707702e2b248251bbef4ab8e39e73ae40bd3fd4de2`.
- `winter.webm`: 911,520 байт; SHA-256 `a61fad6fcf04dd16d7a6d6aa458e9a0200fc98f295a066f57ffd265e9d2c9d9b`.
- `rain.webm`: 698,142 байт; SHA-256 `9661fdd1937e0f897b9c7242ef242a6ad68d91a19544e2118bc3766a9d8aa9b5`.
- `night.webm`: 607,403 байт; SHA-256 `ca170e0bf8aeddf4aa88ec1f0c7a98ca4ed88369f4dded152b97f311b423dceb`.

Итого WebM: 6,700,095 байт (6.39 MiB).
Итого WebM + MP4 + JPEG: 14,838,016 байт.
MP4: H.264 High, level 3.1, yuv420p; WebM: VP9. Все клипы: 960×540, 24fps, 8сек., без аудио.

### Проверка воспроизведения

Фактическая проверка в Playwright Chromium 141.0.7390.37: все шесть WebM успешно воспроизводятся.
Для каждого клипа подтверждены `readyState=4`, отсутствие `MediaError`,
ненулевое растущее `currentTime` и размер видеокадра 960×540.
Машиночитаемая запись: `static/media/playback-check.json`.
