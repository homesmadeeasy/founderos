# Identity Engine — Confidence Model

Declared facts: confidence **1.0**.

Observed facts use `calculateObservationConfidence`:

- observation count (saturates)  
- average evidence weight  
- consistency vs minimum threshold  
- recency (days since last evidence)  
- contradiction penalty  
- manual confirm → 1.0  
- manual reject → capped low confidence + `rejected` status  

Confidence is recomputed when observations refresh. UI shows percent via `formatConfidencePercent`.

Dynamic: new evidence can raise confidence; rejection and contradictions lower it.
