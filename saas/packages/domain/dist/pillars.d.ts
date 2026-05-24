export declare const pillars: readonly [{
    readonly key: "strategy";
    readonly label: "Estrategia";
}, {
    readonly key: "people";
    readonly label: "Pessoas";
}, {
    readonly key: "processes";
    readonly label: "Processos";
}, {
    readonly key: "marketing_sales";
    readonly label: "Marketing & Vendas";
}, {
    readonly key: "financial";
    readonly label: "Financeiro";
}];
export type PillarKey = (typeof pillars)[number]['key'];
