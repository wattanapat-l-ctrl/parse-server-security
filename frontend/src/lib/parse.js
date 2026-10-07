import Parse from 'parse'

const serverURL = import.meta.env.VITE_PARSE_SERVER_URL || 'http://localhost:1337/parse'

if (!import.meta.env.VITE_PARSE_SERVER_URL) {
  console.warn(
    `[Parse] ไม่พบ VITE_PARSE_SERVER_URL ใน .env ใช้ค่า default: ${serverURL}`
  )
}

Parse.initialize(
  import.meta.env.VITE_PARSE_APP_ID,
  import.meta.env.VITE_PARSE_JAVASCRIPT_KEY
)

Parse.serverURL = serverURL

export default Parse