namespace input {

    export function onCustomGesture(id: number, update: () => boolean, handler: () => void) {

        if (!update || !handler) return;

        input.acceleration(Dimension.X); // turn on accelerometer

        const evid = DAL.MICROBIT_ACCELEROMETER_EVT_SHAKE + 1 + (id | 0);

        control.onEvent(DAL.MICROBIT_ID_GESTURE, evid, handler);

        let sigma = 0;

        control.inBackground(function () {
            while (true) {
                if (sigma > 0) {
                    sigma--;
                } else if (update()) {
                    sigma = 6;
                    control.raiseEvent(DAL.MICROBIT_ID_GESTURE, evid);
                }
                basic.pause(20)
            }
        })
    }



    export function stepUpdate(): () => boolean {

        let active = true;

        return function () {

            const s = input.acceleration(Dimension.Strength);

            if (!active && s > 1300) {

                active = true;

                return true;

            } else if (s < 1100) {

                active = false;

            }

            return false;

        }

    }

}


