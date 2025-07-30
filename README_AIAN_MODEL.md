# AI Analytics Interface

Веб-интерфейс для тестирования и взаимодействия с различными API искусственного интеллекта.

## Установка

1. Клонируйте репозиторий
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Создайте файл `.env` на основе `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Отредактируйте файл `.env` и добавьте свои настройки

## Переменные окружения

Проект использует библиотеку `dotenv` для загрузки переменных окружения из файла `.env`. Вот список доступных переменных:

| Переменная | Описание | Пример значения |
|------------|----------|-----------------|
| N8N_WEBHOOK_URL | URL веб-хука N8N | http://localhost:5678/webhook/m1 |
| N8N_WEBHOOK_TEST_URL | URL тестового веб-хука N8N | http://localhost:5678/webhook-test/m1 |
| PORT | Порт, на котором будет запущен сервер | 3002 |
| LOG_LEVEL | Уровень логирования | info |
| IS_TEST_MODE | Режим тестирования | false |
| OPENROUTER_API_KEY | API-ключ для OpenRouter | sk-your-api-key |
| LANGCHAIN_PG_URL | URL сервиса Langchain PG | http://localhost:3005 |
| LANGCHAIN_PG_ENABLED | Включить поддержку Langchain PG | true |
| OUTPUT_DOCS_DIR | Директория для сохранения документов | ./output_docs |

## Запуск

```bash
node server.js
```

После запуска приложение будет доступно по адресу http://localhost:3002 (или порту, указанному в переменных окружения).

## Функции

- Отправка запросов к различным моделям AI
- Сохранение и управление промптами
- История запросов и ответов
- Поддержка Retrieval Augmented Generation (RAG)
- Возможность сохранения ответов в формате Markdown 
- Расширенная обработка ошибок с передачей детальной информации клиенту

## API

### POST /api/send-request

Отправляет запрос к модели AI и возвращает ответ.

**Параметры запроса:**
- `model`: Название модели для использования.
- `prompt`: Промпт для модели.
- `inputText`: Входной текст для модели.
- `saveResponse` (необязательно): Логическое значение, указывающее, следует ли сохранять ответ в историю. По умолчанию `false`.

**Пример использования:**

```bash
curl -X POST http://localhost:3002/api/send-request \
-H "Content-Type: application/json" \
-d '{"model": "your-model-name", "prompt": "your-prompt", "inputText": "your-input-text", "saveResponse": true}'
```

### POST /api/send-request-sys

Отправляет запрос к модели AI, используя промпт, выбранный по имени из хранилища промптов.

**Параметры запроса:**
- `model`: Название модели для использования.
- `prompt_name`: Имя системного промпта из хранилища.
- `inputText`: Входной текст для модели.
- `saveResponse` (необязательно): Логическое значение, указывающее, следует ли сохранять ответ в историю. По умолчанию `true`.

### POST /analyze

Альтернативный маршрут для отправки запросов к AI моделям с поддержкой RAG.

### Другие доступные маршруты

Приложение также предоставляет API для:
- Управления промптами (`/api/prompts`)
- Работы с историей ответов (`/api/responses`)
- Взаимодействия с RAG (`/api/rag/*`)
- Работы с файлами (`/api/save-markdown`, `/api/output-dir-info`)

Полная документация API доступна в файле [README_AIAN_MODEL_REST.md](README_AIAN_MODEL_REST.md).

### GET /api/available-models

Возвращает список доступных моделей.

**Пример использования:**

```bash
curl -X GET http://localhost:3002/api/available-models
```

**Ответ:**

```json
[
  "google/gemma-3-27b-it:free",
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemini-2.0-flash-thinking-exp-1219:free",
  "google/gemini-2.0-pro-exp-02-05:free",
  "google/gemini-2.0-flash-thinking-exp:free",
  "deepseek/deepseek-chat:free",
  "deepseek/deepseek-r1-zero:free",
  "deepseek/deepseek-r1-distill-llama-70b:free",
  "deepseek/deepseek-r1:free",
  "qwen/qwq-32b:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
  "moonshotai/moonlight-16b-a3b-instruct:free",
  "nousresearch/deephermes-3-llama-3-8b-preview:free",
  "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
  "cognitivecomputations/dolphin3.0-mistral-24b:free",
  "sophosympatheia/rogue-rose-103b-v0.2:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "nvidia/llama-3.1-nemotron-70b-instruct:free",
  "gryphe/mythomax-l2-13b:free"
]
```

### Расширенная обработка ошибок

Все API-эндпоинты, связанные с вызовом моделей AI (`/api/send-request`, `/api/send-request-sys`, `/analyze`), возвращают расширенную информацию об ошибках:

**Пример ответа при некорректной структуре ответа от AI модели:**
```json
{
  "error": "Invalid response from AI model",
  "data": {
    // Содержит полные данные ответа от API
  }
}
```

**Пример ответа при других ошибках:**
```json
{
  "error": "API Error: 429 - Rate limit exceeded",
  "details": {
    // Подробная информация об ошибке
    "error": "rate_limit_exceeded",
    "message": "Your API requests are being rate-limited"
  }
}
```

Это позволяет клиентским приложениям получать больше информации о возникших ошибках и лучше их обрабатывать. 