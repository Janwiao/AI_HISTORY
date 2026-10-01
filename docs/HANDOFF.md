# AI_HISTORY 專案交接｜2026-10-01 · DOT / dots

這是既有網站的延續維護，不是重新製作一張圖片或另開新網站。新對話請先讀此文件，再讀取 GitHub 上最新 `main`；當文件與目前程式不一致，以最新實際檔案為準，並說明差異。

## 1. 專案與修改界線

- 唯一授權修改的 repository：`Janwiao/AI_HISTORY`。
- Repository：https://github.com/Janwiao/AI_HISTORY
- 預覽入口：https://janwiao.github.io/AI_HISTORY/
- Agent 頁：https://janwiao.github.io/AI_HISTORY/agents.html
- DOT 直達：https://janwiao.github.io/AI_HISTORY/agents.html#openai-dots
- 分支：`main`；沿用既有 GitHub Pages 發布，不改 Cloudflare、DNS、其他 repository 或主站設定。
- 不要因較早對話曾說 GitHub「只能讀取」就停止操作。先檢查當前已連接的 GitHub 工具、授權及實際回傳；可寫入時依使用者當次要求提交。遇到拒絕、衝突或缺權限須如實回報。

## 2. 使用者真正要的網站

追蹤大家常討論的 AI 模型及版本發布，呈現跨廠商的橫向時間軸。不要只留下少數整數大版本，也不要把一張海報當完整資料庫。

既有視覺方向是可縮放 SVG／網頁；要求放大文字仍清楚、桌面滑鼠拖曳、手機單指拖動／雙指縮放、品牌跳轉、點節點看來源，以及適合電腦和手機的版面。保留品牌辨識，但目前不少圖示只是簡化符號，不可冒稱官方 Logo。搜尋、篩選、更完整品牌圖等方向曾討論過，不代表全部已完成。

這是非 RO 的獨立專案。不要導入 RO 工具站或購物站的架構與需求。

## 3. 模型與 Agent 必須分頁

- `index.html`：模型史。GPT、Claude、Gemini、Grok、DeepSeek、Kimi、Qwen 等模型與實際模型分支放這裡。
- `agents.html`：Agent／工具產品史。Hermes Agent、OpenClaw（龍蝦）、Codex 產品、Claude Code、dots 放這裡。
- Jev 沿用本站既有的 `Decision Layer` 獨立標記；不要默默改分類。它的描述與首發資料仍須另行核實。
- Codex 產品與帶 Codex 名稱的模型要區分。產品功能更新不直接算成底層模型升代。
- 語音、翻譯、Embedding、影像等模型支線也要標出類別；不要把它們畫成通用旗艦的直接下一代。

## 4. 本次 DOT 已補什麼

此處 DOT 指近期的 **OpenAI dots**。官方產品名稱是 `dots`，單一代理稱 `dot`；頁面保留 `DOT` 作辨識別名。

查核日期為 2026-10-01；官方公告正文日期為 **2026-09-29**。分類是全天候 Agent 產品，而非新 GPT 模型。官方說明其使用 GPT-6 Astra 與雲端電腦執行工作。[DOT-1]

`agents.html` 新增第一張產品卡：`id="openai-dots"`、`data-k="agent"`、`data-product="openai-dots"`。卡片包含公告／分批推出日期、同日 specialist dots 企業預覽、權限摘要、查核日期與三個官方來源。沒有捏造 dots 1.0 之類的版本號，也沒有把企業預覽另計成新模型。

原有五張產品卡保留，現在是六張。主頁恢復 `Agents & Tools` 相對連結，並以 `ResizeObserver` 配合視窗 resize 更新工具列高度，避免手機換行後蓋住畫布。

本次只改 `agents.html`、`index.html`、`README.md`，新增本文件。**沒有修改** `data/updates.json`、`assets/timeline.js`、歷史快照、Excel、網域或 Pages 設定。

官方依據：

- [DOT-1] 英文原始公告：https://openai.com/index/introducing-dots/
- [DOT-2] 繁體中文公告：https://openai.com/zh-Hant/index/introducing-dots/
- [DOT-3] 產品頁：https://chatgpt.com/features/dots/

後續查核以頁面內文明確日期為準，不使用搜尋引擎的「幾天前」或抓取日替代。方案、地區、試行和全面可用應分開描述。

## 5. 實際檔案架構與資料流

```text
index.html                              模型史入口、工具列、更新面板與詳情視窗
agents.html                             Agent 產品卡與分類篩選；資料目前直接寫在 HTML
assets/timeline.js                      讀底稿與增量資料，合併後重新渲染 SVG
archive/2026-10-01-base.html             更新前網站快照；不是全量重新查證的 10/01 資料
data/updates.json                      2026-10-01 的模型增量資料
data/AI模型完整族譜_2023-2026_v2.xlsx     舊版資料表，不等同最新網站完整資料
README.md                               入口、更新說明與交接連結
docs/HANDOFF.md                         本交接文件
```

模型主頁載入 `assets/timeline.js?v=20261001`；該程式讀 `data/updates.json?v=20261001`，再依 `baselinePath` 讀 `archive/2026-10-01-base.html`。程式從底稿 SVG 的 `text.vendor`、`text.model`、`text.date`、`text.tag` 和連結解析歷史紀錄。

增量 JSON 目前是 `schemaVersion: 1`，主要欄位為 `checkedAt`、`baselinePath`、`note`、`additions`。每筆包含 `vendor`、`model`、`date`、`category`、`tags`、`note`、`sources`。以 `vendor|model` 當合併鍵；同鍵會覆蓋，不是新增一筆。

品牌清單目前從底稿 SVG 推導，不是從全部增量資料自動補齊。因此新增「全新品牌」時，只寫 JSON 未必會顯示。Agent 頁的資料和篩選邏輯則獨立內嵌在 HTML，尚未有 `data/agents.json`。

## 6. 不可忽略的既有待查項

這些是接手時的待辦，不是本次已完成的修正，也不要因前面助理曾說「都確認了」就當作已驗證。

1. **歷史資料需逐筆稽核。** 原始底稿宣稱 208 個節點、19 品牌，現有增量檔有 19 筆。這些數字不是全市場完整清單；本次只查 dots，沒有重查所有歷史日期或規格。
2. **日期精度與節點數需實測。** 現行程式用 `Date.parse(s+'T00:00:00Z')` 解析日期，並直接篩掉解析失敗的紀錄。底稿有 `YYYY-MM` 月精度資料；本機 Node 的月份範例可以解析，不能武斷宣稱所有月份都會變成 `NaN`。但尚未完整測試各瀏覽器與全部節點。應明確處理日期精度、回報解析錯誤、核對去重及實際渲染數；以月初定位時仍顯示月份，不能偽裝成精確到日。不要只用 208+19 當作已完成的顯示驗證。
3. **部分增量來源需補正。** 現有 Qwen3.8-Omni-Flash 來源指向名稱為 LiveTranslate 的路徑，Qwen-Image-2.1 來源指向 qwen-robot 路徑；這是待核對警訊，不表示僅憑網址就能判定模型不存在。應找到真正支援該筆日期與內容的原廠公告。
4. **GLM-5.3-Flash 日期曾在舊對話出現不一致。** 目前 JSON 記為 2026-10-01，但不能把這當本次重新核實的結果。要區分原廠首發、文章更新、供應商上架與 API 可用日。
5. **手勢與字型全面回歸尚待做。** 本次未修改模型頁的拖曳／縮放 JS，也沒有宣稱所有實機瀏覽器手勢均通過。保留舊功能，改版時再檢查拖曳誤開連結、雙指轉單指跳動、來源視窗與窄螢幕排版。
6. **Agent 舊卡也非全部精確時間軸。** Hermes、OpenClaw 等有概述性的年份／Current 標記；Jev 卡缺直接來源。不可把它們當成逐版完整、持續即時查核的紀錄。
7. **全新品牌及 NEW 語義。** 除了品牌推導問題，`NEW` 現為增量檔中的記錄標記，不必然代表最近才首發；補漏、更正和真正近期發布最好拆開顯示。

## 7. 本次測試與限制

對從連接器取得且以 Git blob SHA 比對一致的原始 `agents.html`、`index.html` 做局部修改，保留既有產品卡。

本機 Chromium／Playwright 以 `set_content` 渲染修改後 HTML，測試 320、360、390、768、1440px：六張卡、全部／Agent／Coding／Decision 四種篩選、DOT 捲動定位、窄螢幕無頁面水平溢出、主頁與 Agent 頁相對連結、工具列實際高度與畫布上緣一致；未出現 JS page error。

限制：這不是實機 iPhone Safari／Android 測試；主頁工具列測試用 stub 代替未修改的模型渲染 JS，因此不是全站資料與手勢 E2E。遠端 GitHub Pages 是否部署成功，必須另查對應 commit 的 Actions 狀態，不能由本機畫面推定。

## 8. 提交與後續維護方式

本次修改前 `main` 為 `08b20640f7a1f49d2061c59d5ad1566dde729ed1`，base tree 為 `4fb8beacc8e3acddf002c52ae912f1a471b9cb79`。本文件與 DOT 變更一起提交；新對話應讀最新 `main`，不要用以上舊 SHA 覆蓋新進度。

一般流程：先讀 repository tree／最新 commit／目標檔，再查官方公告或 release notes；確認名稱、日期口徑與分類後，只做必要修改。保存原資料、避免重複和默默刪除節點，檢查相對路徑與手機操作。建立 tree／commit 後，還必須成功更新分支 ref，最後重新讀取檔案並查部署。

不得 force push，不得以舊整包覆蓋別人的更新。發生分支前進時先重新讀取並整合。最終回覆區分「本機已做好」「已提交 main」「Pages 已部署」「實際功能測試」；每一步只報確定結果。

本次沒有新增自動更新排程。往後新對話不能假裝一直在背景維護此網站。

## 9. 新對話啟動指令

請接手 `Janwiao/AI_HISTORY`，不要重建網站。先用目前可用的 GitHub 連接器讀取最新 `main`、此 `docs/HANDOFF.md`、`index.html`、`agents.html`、`assets/timeline.js` 和 `data/updates.json`，確認實際結構與本文件差異。保留模型／Agent 分頁和所有既有互動功能。後續依我新的指示修改；不要未經要求就批次清除尚待稽核的舊資料。先回報已讀取的版本及未解問題即可，不必再次詢問專案背景。
