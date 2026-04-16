declare module 'penner' {
    type EasingFunction = (t: number, b: number, c: number, d: number) => number;

    const penner: {
        linear: EasingFunction;
        easeInQuad: EasingFunction;
        easeOutQuad: EasingFunction;
        easeInOutQuad: EasingFunction;
        easeInCubic: EasingFunction;
        easeOutCubic: EasingFunction;
        easeInOutCubic: EasingFunction;
        // 필요한 다른 이징 함수들을 추가하십시오.
        [key: string]: EasingFunction;
    };

    export = penner;
}