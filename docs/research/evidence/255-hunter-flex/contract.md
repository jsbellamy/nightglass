# Contract declaration — Hunter flexible reacquire (#255)

| Field | Value |
| --- | --- |
| Asset class | Character (Party Character — Hunter) |
| Status | candidate for shipping |
| Runtime destination | `src/assets/sprites/hunter.png` |
| Runtime shape | per-asset RGBA, binary alpha, `moonberry-16`, native 1×; opaque bounds ≤ 40×68 |
| Visual vocabulary | `moonberry-16`; Moonberry night-garden cohort via Knight style reference |
| Geometry | Party Character facing **RIGHT**; bottom-centre foot anchor; no min/fill |
| Review context | native 1× Formation Front/Middle/Back + five-Opponent scene |
| Validator | `pipeline/acquire.py measure --tag hunter`; promote + targeted build gates |

## Reference roles (pre-replacement)

| Role | Path | SHA-256 |
| --- | --- | --- |
| identity | `assets-raw/grid_raw/hunter.png` | `d5cdbb892abeeedac796e1a48a136cefe2eb55bda72be7f04e37748ce45ffc97` |
| style | `assets-raw/grid_raw/knight.png` | `9dfcdd69592cec858d9ff4d53429a2a3b48815918f4b463083e7201d69546cb5` |
| Party runtime peers (formation review) | `src/assets/sprites/knight.png`, `priest.png`, `wizard.png` | — |
