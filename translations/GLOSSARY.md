# Translation glossary

Terminology anchor for the Desktop language packs. Translators (human or AI)
must use these choices consistently across every namespace. Product names stay
verbatim in every language: `DeepSeek`, `V4 Flash`, `V4 Pro`, `PTC`, `MCP`,
`DSH`, `AI Shell Desktop`, `Profile` (the desktop concept keeps its English
name in every language), `Agents-Anywhere`.

Placeholders such as `{name}`, `{count}`, `{message}`, `{model}`, `{effort}`,
`{label}`, `{title}` must appear exactly once per string, unchanged. Keep
source punctuation style: strings that carry no trailing period keep none.

| en | zh | zh-Hant | ja | ko | es | fr | de |
| --- | --- | --- | --- | --- | --- | --- | --- |
| workspace | 工作区 | 工作區 | ワークスペース | 작업 공간 | espacio de trabajo | espace de travail | Arbeitsbereich |
| session | 会话 | 工作階段 | セッション | 세션 | sesión | session | Sitzung |
| host (connection target) | 主机 | 主機 | ホスト | 호스트 | host | hôte | Host |
| plugin | 插件 | 外掛 | プラグイン | 플러그인 | complemento | extension | Plugin |
| plugin market | 插件市场 | 外掛市集 | プラグインマーケット | 플러그인 마켓 | mercado de complementos | marché d’extensions | Plugin-Markt |
| agent | 智能体 | 智慧代理 | エージェント | 에이전트 | agente | agent | Agent |
| subagent | 子代理 | 子代理 | サブエージェント | 하위 에이전트 | subagente | sous-agent | Subagent |
| tool | 工具 | 工具 | ツール | 도구 | herramienta | outil | Werkzeug |
| command | 命令 | 指令 | コマンド | 명령 | comando | commande | Befehl |
| terminal | 终端 | 終端機 | ターミナル | 터미널 | terminal | terminal | Terminal |
| model | 模型 | 模型 | モデル | 모델 | modelo | modèle | Modell |
| reasoning effort | 推理等级 | 推理等級 | 推論レベル | 추론 수준 | nivel de razonamiento | effort de raisonnement | Denkaufwand |
| turn (conversation turn) | 轮次 | 回合 | ターン | 턴 | turno | tour | Runde |
| proposed command | 待执行命令 | 待執行指令 | 実行待ちコマンド | 실행 대기 명령 | comando propuesto | commande proposée | vorgeschlagener Befehl |
| full access | 完全权限 | 完全權限 | 完全アクセス | 전체 접근 | acceso completo | accès complet | Vollzugriff |
| read only | 仅可查看 | 僅可檢視 | 読み取り専用 | 읽기 전용 | solo lectura | lecture seule | Nur Lesen |
| notification | 通知 | 通知 | 通知 | 알림 | notificación | notification | Benachrichtigung |
| update | 更新 | 更新 | アップデート | 업데이트 | actualización | mise à jour | Update |
| workflow | 工作流 | 工作流程 | ワークフロー | 워크플로 | flujo de trabajo | flux de travail | Workflow |
| skill | 技能 | 技能 | スキル | 스킬 | habilidad | compétence | Skill |
| goal | 目标 | 目標 | ゴール | 목표 | objetivo | objectif | Ziel |
| plan mode | 计划模式 | 計畫模式 | プランモード | 플랜 모드 | modo de planificación | mode plan | Planungsmodus |
| background job | 后台任务 | 背景工作 | バックグラウンドジョブ | 백그라운드 작업 | tarea en segundo plano | tâche d’arrière-plan | Hintergrundaufgabe |
| reload / refresh | 刷新 | 重新整理 | 更新 | 새로 고침 | actualizar | actualiser | aktualisieren |
| settings | 设置 | 設定 | 設定 | 설정 | ajustes | paramètres | Einstellungen |

Additional rules:

- 繁體中文 uses Taiwan conventions while staying readable in Hong Kong: 外掛,
  工作階段, 終端機, 設定, 檔案, 網路.
- Japanese uses です・ます-less noun phrases for labels and button text;
  full sentences in dialog descriptions.
- Korean uses 한다체-less polite 해요체 only in descriptions; labels are plain
  noun phrases.
- Spanish uses neutral (LATAM-understanding) vocabulary, no regionalisms.
- French uses typographic apostrophes (’) and non-breaking spaces before `:`;
  `!`; `?` as the source already does in French UI conventions.
- German uses formal address avoided entirely (no "Sie" where the source has
  no pronoun) and sentence-case for labels.
