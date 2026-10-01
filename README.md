# AI_HISTORY

互動式 AI 模型歷史／族譜時間軸。  
GitHub Pages：https://janwiao.github.io/AI_HISTORY/

## DOT / Agent 產品更新：2026-10-01

[Agents & Tools](./agents.html#openai-dots) 已補入 OpenAI **dots（DOT）**，官方公告日為 **2026-09-29**。此產品屬 Agent 系統，不是新的 GPT 模型版本，因此不加入模型總數。主頁也恢復 Agents & Tools 入口。

官方來源：[Introducing dots](https://openai.com/index/introducing-dots/)／[繁體中文](https://openai.com/zh-Hant/index/introducing-dots/)。

接手請讀 [docs/HANDOFF.md](./docs/HANDOFF.md)：包含範圍、實際架構、分類規則、本次測試與既有資料的待稽核項。本次只查核 dots，沒有重新驗證以下全部模型紀錄。

## 模型更新紀錄：2026-10-01

既有增量資料收錄下列節點；日期、名稱與來源仍應依交接文件的待辦持續核對：

- OpenAI：GPT-6 Sol、GPT-6 Luna、GPT-6.1 Sol、GPT-Live-1
- Anthropic：Claude Opus 5.5、Claude Sonnet 5.5
- Google：Gemini 3.8 TTS、Gemini 3.8 Live with Live Avatar、Gemini 4 Argon
- xAI：Grok 4.7
- DeepSeek：DeepSeek-V4.1-Flash
- Alibaba/Qwen：Qwen3.8-Omni-Flash、Qwen3.8-LiveTranslate、Qwen-Image-2.1
- Z.ai：GLM-5.3-Flash
- Cohere：North Small Translate 1.0、Embed 5 Pro / Fast

網站將 2026-10-01 更新前版本封存在 `archive/2026-10-01-base.html`，主頁以該快照為歷史底稿，再套用 `data/updates.json` 的最新節點。

> 不把產品功能更新誤算成新模型；語音、翻譯、Embedding、影像模型會標示為支線。舊 Excel 不等同網站最新完整資料。

## 操作

- 桌面：滑鼠拖曳、Ctrl/Cmd + 滾輪縮放
- 手機：單指拖曳、雙指縮放
- 品牌跳轉
- 點節點查看來源
- 從主頁切換 Agents & Tools；該頁提供獨立的產品分類篩選

## 操作體驗更新：2026-10-01

- 電腦以 100% 閱讀大小開啟，定位第一個品牌的近期節點；「總覽」可看全部歷史，「最新」定位目前條件下的最新節點
- 手機預設閱讀列表，可隨時切回橫向時間軸；搜尋、品牌、年份、能力可交叉篩選
- 篩選與檢視方式保留於網址，支援返回／前進；詳情可複製單一模型連結
- 詳情與更新改用可關閉的對話框；更新預設關閉，手機也有「更新」入口
- 時間軸支援滑鼠／單指拖曳、雙指縮放、Ctrl/Cmd + 滾輪；空白鍵／Enter 開啟節點，時間軸聚焦時方向鍵移動、`+` / `-` 縮放、`0` 回到 100%，`/` 聚焦搜尋
- 日期明確區分月份與日，4 筆月份資料保留原精度；208 筆底稿 + 19 筆增量，實際合併為 227 個節點、19 品牌，沒有刪除舊紀錄
- Qwen3.8-Omni-Flash 與 Qwen-Image-2.1 已改用對應官方公告，Image 補研究授權與商用限制

### 開發／測試

純靜態網站，不需要打包，從 repository 根目錄提供 HTTP 服務即可。執行 `node --test tests/data.test.cjs` 可跑無依賴資料測試。DOM 狀態測試使用 jsdom：將 jsdom 安裝於測試環境，再執行 `NODE_PATH=/path/to/node_modules node --test tests/*.test.cjs`。測試涵蓋資料保留、日期、搜尋／篩選、手機預設、詳情與返回、重複開關、手勢中斷及載入錯誤；DOM 測試不等同實機瀏覽器版面／觸控驗證。
