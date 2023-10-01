export const numberToWords = (num: number)=> {
    const units: string[] = ["ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
    const teens: string[] = ["одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
    const tens: string[] = ["", "десять", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
    const scales: string[] = ["", "тысяча", "миллион", "миллиард", "триллион"];

    function numberToWordsInternal(num: number, scaleIndex: number): string {
        if (num === 0) {
            return "";
        }

        const scaleWord = scales[scaleIndex];
        const scaleValue = Math.floor(num / 1000);
        const unitValue = num % 1000;

        let result = "";
        if (scaleValue > 0) {
            result += numberToWordsInternal(scaleValue, scaleIndex + 1) + " " + scaleWord + " ";
        }

        if (unitValue > 0) {
            if (unitValue < 10) {
                result += units[unitValue] + " ";
            } else if (unitValue < 20) {
                result += teens[unitValue - 11] + " ";
            } else {
                const tensValue = Math.floor(unitValue / 10);
                const unit = unitValue % 10;
                result += tens[tensValue] + " ";
                if (unit > 0) {
                    result += units[unit] + " ";
                }
            }
        }

        return result.trim();
    }

    if (num === 0) {
        return units[0]; // "ноль"
    } else if (num < 0) {
        return "минус " + numberToWordsInternal(-num, 0);
    } else {
        return numberToWordsInternal(num, 0);
    }
}