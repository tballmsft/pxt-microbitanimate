/**
 * Color manipulation
 */
//% advanced=1
namespace color {
    export enum ColorBufferLayout {
        /**
         * 24bit RGB color
         */
        RGB,
        /**
         * 32bit RGB color with alpha
         */
        ARGB
    }

    /**
     * A buffer of colors
     */
    export class ColorBuffer {
        layout: ColorBufferLayout;
        buf: Buffer;

        constructor(length: number, layout?: ColorBufferLayout) {
            this.layout = layout || ColorBufferLayout.RGB;
            this.buf = control.createBuffer((length | 0) * this.stride);
        }

        static fromBuffer(buffer: Buffer, layout: ColorBufferLayout) {
            const b = new ColorBuffer(0, layout);
            b.buf = buffer;
            return b;
        }

        get stride() {
            return this.layout == ColorBufferLayout.RGB ? 3 : 4;
        }

        get length() {
            return Math.idiv(this.buf.length, this.stride);
        }

        color(index: number): number {
            index = index | 0;
            if (index < 0 || index >= this.length) return -1;

            const s = this.stride;
            const start = index * s;
            let c = 0;
            for (let i = 0; i < s; ++i)
                c = (c << 8) | (this.buf[start + i] & 0xff);
            return c;
        }

        setColor(index: number, color: number) {
            index = index | 0;
            if (index < 0 || index >= this.length) return;

            const s = this.stride;
            const start = index * s;
            for (let i = s - 1; i >= 0; --i) {
                this.buf[start + i] = color & 0xff;
                color = color >> 8;
            }
        }

        slice(start?: number, length?: number): ColorBuffer {
            const s = this.stride;
            if (start === undefined)
                start = 0;
            start = start | 0;
            if (start < 0)
                start = this.length - start;
            if (length === undefined)
                length = this.length;
            else if (length < 0)
                length = this.length - length;
            length = Math.min(length | 0, this.length - length - start);
            const b = new ColorBuffer(length, this.layout);
            for (let i = 0; i < length; ++i) {
                b.setColor(i, this.color(start + i));
            }
            return b;
        }

        /**
         * Writes the content of the src color buffer starting at the start dstOffset in the current buffer
         * @param dstOffset 
         * @param src 
         */
        write(dstOffset: number, src: ColorBuffer): void {
            if (this.layout == src.layout) {
                const d = (dstOffset | 0) * this.stride;
                this.buf.write(d, src.buf);
            } else {
                // different color layout
                const n = Math.min(src.length, this.length - dstOffset);
                for (let i = 0; i < n; ++i)
                    this.setColor(dstOffset + i, src.color(i));
            }
        }
    }

    /**
     * Converts an array of colors into a color buffer
     */
    export function createBuffer(colors: number[], layout?: ColorBufferLayout): color.ColorBuffer {
        const p = new ColorBuffer(colors.length, layout);
        const n = colors.length;
        for (let i = 0; i < n; i++) {
            p.setColor(i, colors[i]);
        }
        return p;
    }



    /**
 * Converts red, green, blue channels into a RGB color
 * @param red value of the red channel between 0 and 255. eg: 255
 * @param green value of the green channel between 0 and 255. eg: 255
 * @param blue value of the blue channel between 0 and 255. eg: 255
 */
    //% blockId="colorsrgb" block="red %red|green %green|blue %blue"
    //% red.min=0 red.max=255 green.min=0 green.max=255 blue.min=0 blue.max=255
    //% help="colors/rgb"
    //% weight=19 blockGap=8
    //% blockHidden=true
    export function rgb(red: number, green: number, blue: number): number {
        return ((red & 0xFF) << 16) | ((green & 0xFF) << 8) | (blue & 0xFF);
    }

    export function argb(alpha: number, red: number, green: number, blue: number): number {
        return ((alpha & 0xFF) << 24) | ((red & 0xFF) << 16) | ((green & 0xFF) << 8) | (blue & 0xFF);
    }

    /**
    * Get the RGB value of a known color
    */
    //% blockId=colorscolors block="%color"
    //% help="colors/well-known"
    //% shim=TD_ID
    //% weight=20 blockGap=8
    //% blockHidden=true
    export function wellKnown(color: Colors): number {
        return color;
    }

    /**
     * Convert an HSV (hue, saturation, value) color to RGB
     * @param hue value of the hue channel between 0 and 255. eg: 255
     * @param sat value of the saturation channel between 0 and 255. eg: 255
     * @param val value of the value channel between 0 and 255. eg: 255
     */

    //% blockId="colorshsv" block="hue %hue|sat %sat|val %val"
    //% hue.min=0 hue.max=255 sat.min=0 sat.max=255 val.min=0 val.max=255
    //% help="colors/hsv"
    //% weight=17
    //% blockHidden=true
    export function hsv(hue: number, sat: number = 255, val: number = 255): number {
        let h = (hue % 255) >> 0;
        if (h < 0) h += 255;
        // scale down to 0..192
        h = (h * 192 / 255) >> 0;

        //reference: based on FastLED's hsv2rgb rainbow algorithm [https://github.com/FastLED/FastLED](MIT)
        let invsat = 255 - sat;
        let brightness_floor = ((val * invsat) / 255) >> 0;
        let color_amplitude = val - brightness_floor;
        let section = (h / 0x40) >> 0; // [0..2]
        let offset = (h % 0x40) >> 0; // [0..63]

        let rampup = offset;
        let rampdown = (0x40 - 1) - offset;

        let rampup_amp_adj = ((rampup * color_amplitude) / (255 / 4)) >> 0;
        let rampdown_amp_adj = ((rampdown * color_amplitude) / (255 / 4)) >> 0;

        let rampup_adj_with_floor = (rampup_amp_adj + brightness_floor);
        let rampdown_adj_with_floor = (rampdown_amp_adj + brightness_floor);

        let r: number;
        let g: number;
        let b: number;
        if (section) {
            if (section == 1) {
                // section 1: 0x40..0x7F
                r = brightness_floor;
                g = rampdown_adj_with_floor;
                b = rampup_adj_with_floor;
            } else {
                // section 2; 0x80..0xBF
                r = rampup_adj_with_floor;
                g = brightness_floor;
                b = rampdown_adj_with_floor;
            }
        } else {
            // section 0: 0x00..0x3F
            r = rampdown_adj_with_floor;
            g = rampup_adj_with_floor;
            b = brightness_floor;
        }
        return rgb(r, g, b);
    }

    /**
     * Fade the color by the brightness
     * @param color color to fade
     * @param brightness the amount of brightness to apply to the color, eg: 128
     */
    //% blockId="colorsfade" block="fade %color=Xneopixel_colors|by %brightness"
    //% brightness.min=0 brightness.max=255
    //% help="light/fade"
    //% group="Color" weight=18 blockGap=8
    //% blockHidden=true
    export function fade(color: number, brightness: number): number {
        brightness = Math.max(0, Math.min(255, brightness >> 0));
        if (brightness < 255) {
            let red = unpackR(color);
            let green = unpackG(color);
            let blue = unpackB(color);

            red = (red * brightness) >> 8;
            green = (green * brightness) >> 8;
            blue = (blue * brightness) >> 8;

            color = rgb(red, green, blue);
        }
        return color;
    }

    export function blend(color: number, alpha: number, otherColor: number) {
        alpha = Math.max(0, Math.min(0xff, alpha | 0));
        const malpha = 0xff - alpha;
        const r = (unpackR(color) * malpha + unpackR(otherColor) * alpha) >> 8;
        const g = (unpackG(color) * malpha + unpackG(otherColor) * alpha) >> 8;
        const b = (unpackB(color) * malpha + unpackB(otherColor) * alpha) >> 8;
        return rgb(r, g, b);
    }

    export function gradient(startColor: number, endColor: number, steps: number): ColorBuffer {
        steps = Math.max(2, steps | 0);
        const b = new ColorBuffer(steps);
        b.setColor(0, startColor);
        b.setColor(b.length - 1, endColor);
        for (let i = 1; i < steps - 1; ++i) {
            const alpha = Math.idiv(0xff * i, steps);
            const c = blend(startColor, alpha, endColor);
            b.setColor(i, c);
        }
        return b;
    }

    export function unpackR(rgb: number): number {
        return (rgb >> 16) & 0xFF;
    }
    export function unpackG(rgb: number): number {
        return (rgb >> 8) & 0xFF;
    }
    export function unpackB(rgb: number): number {
        return (rgb >> 0) & 0xFF;
    }

    export function parseColor(color: string): number {
        switch (color) {
            case "RED":
            case "red":
                return Colors.Red;
            case "GREEN":
            case "green":
                return Colors.Green;
            case "BLUE":
            case "blue":
                return Colors.Blue;
            case "WHITE":
            case "white":
                return Colors.White;
            case "ORANGE":
            case "orange":
                return Colors.Orange;
            case "PURPLE":
            case "purple":
                return Colors.Purple;
            case "YELLOW":
            case "yellow":
                return Colors.Yellow;
            case "PINK":
            case "pink":
                return Colors.Pink;
            default:
                return parseInt(color) || 0;
        }
    }
}
