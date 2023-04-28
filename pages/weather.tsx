import { useState, useEffect } from "react";
import { GetServerSideProps, GetStaticProps } from "next";
import Layout from "../components/Layout"
import React from "react";

type Camera = {
    timestamp: string;
    image: string;
    location: {
        latitude: number;
        longitude: number;
        name: string;
    };
    camera_id: string;
    image_metadata: {
        height: number;
        width: number;
        md5: string;
    };
};

type TrafficData = {
    items: {
        timestamp: string;
        cameras: Camera[];
    }[];
    api_info: {
        status: string;
    };
};

type Props = {
    trafficData: TrafficData;
    weatherData: WeatherData;
    date: string;
    time: string;
};

type WeatherData = {
    items: {
        timestamp: string;
        forecasts: Forecast[];
    }[];
    area_metadata: Location[];
}

type Forecast = {
    area: string;
    forecast: string;
}

type Location = {
    name: string;
    label_location: {
        latitude: number;
        longitude: number;
    };
}

interface WeatherLocation extends Location { };

export default function Traffic({ trafficData, weatherData, date, time }: Props) {
    // console.log('td', trafficData)
    // console.log('wd', weatherData)

    const today = new Date();
    const maxDate = today.toISOString().slice(0, 10); // format the date as yyyy-mm-dd

    const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
    const [cameras, setCameras] = useState<Camera[]>(trafficData.items.flatMap(item => item.cameras))

    // const [filterTraffic, setFilterTraffic] = useState<string>("");
    const [filterDate, setFilterDate] = useState<string>("");
    const [filterTime, setFilterTime] = useState<string>("");
    const [filterForecast, setFilterForecast] = useState<string>("");
    const [newTrafficData, setNewTrafficData] = useState<TrafficData>(trafficData);

    const [forecasts, setForecasts] = useState<Forecast[]>(weatherData.items.flatMap(item => item.forecasts));

    function deg2rad(deg: number) {
        return deg * (Math.PI / 180)
    }

    function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const earthRadiusKm = 6371;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    function getClosestCamera(trafficData: TrafficData, weatherLocation: WeatherLocation) {
        let closestCamera: Camera | undefined;
        let closestDistance = Infinity;

        //loop through traffic data items to get the long lat to compare against weatherlocation, returns the closest camera to that location
        for (const item of trafficData.items) {
            for (const camera of item.cameras) {
                const distance = getDistanceFromLatLonInKm(
                    weatherLocation.label_location.latitude, weatherLocation.label_location.longitude,
                    camera.location.latitude, camera.location.longitude
                );
                if (distance < closestDistance) {
                    closestCamera = camera;
                    closestDistance = distance;
                }
            }
        }

        return closestCamera;
    }

    async function handleFilterDateChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFilterDate(e.target.value);
        await fetchTrafficData(e.target.value, filterTime);
    }

    async function handleFilterTimeChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setFilterTime(e.target.value);
        await fetchTrafficData(filterDate, e.target.value);
    }

    async function handleFilterForecast(e: React.ChangeEvent<HTMLSelectElement>) {
        setFilterForecast(e.target.value)

        const weatherLocation = weatherData.area_metadata.filter(area => area.name === e.target.value)[0];
        // console.log('clloest',getClosestCamera(newTrafficData, weatherLocation))
        const closestCamera = getClosestCamera(newTrafficData, weatherLocation);
        if (closestCamera) {
            setSelectedCamera(closestCamera.camera_id);

            console.log('set alr', closestCamera.camera_id)
        }

    }


    async function fetchTrafficData(date: string, time: string) {
        const dateTime = `${date}T${time}:00`;
        const res = await fetch(`https://api.data.gov.sg/v1/transport/traffic-images?date_time=${dateTime}`);
        const trafficData: TrafficData = await res.json();

        if (trafficData && trafficData.items) {
            for (const item of trafficData.items) {
                for (const camera of item.cameras) {
                    const locationName = await getLocationName(camera.location.latitude, camera.location.longitude);
                    camera.location.name = locationName;
                }
            }
            setNewTrafficData(trafficData);
        }
    }


    useEffect(() => {
        try {
            setCameras(newTrafficData.items.flatMap(item => item.cameras));
        }
        catch (err) {
            console.error(err)
        }

    }, [newTrafficData]);

    return (
        <Layout>
            <div className="container">
                <div className="row">
                    <div className="col-12">
                        {weatherData && weatherData.items && weatherData.items.length > 0 && (
                            <div className="card">
                                <div className="card-body">
                                    <h3>Locations</h3>

                                    <select name="forecast" onChange={handleFilterForecast} className="form-control">
                                        {weatherData.items[0].forecasts.map((forecast) => (
                                            <option key={forecast.area}
                                                value={forecast.area}>
                                                {forecast.area}
                                            </option>
                                        ))}
                                    </select>
                                    {forecasts.filter(forecast => forecast.area === filterForecast).map((forecast) => (
                                        <div key={forecast.area} className="mt-3">
                                            <p>{forecast.forecast}</p>
                                        </div>
                                    ))}


                                    <div className="row mt-5">
                                        <h3>Traffic Cameras</h3>
                                    </div>
                                    <div className="row mt-2">
                                        <div className="col-6">
                                            <input
                                                type="date"
                                                value={filterDate}
                                                // onChange={(e) => setFilterDate(e.target.value)}
                                                onChange={handleFilterDateChange}
                                                placeholder="Date YYYY-MM-DD"
                                                className="form-control"
                                                max={maxDate}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <select name="timefilter" onChange={handleFilterTimeChange} className="form-control">
                                                <option value="00:00">
                                                    00:00
                                                </option>
                                                <option value="01:00">
                                                    01:00
                                                </option>
                                                <option value="02:00">
                                                    02:00
                                                </option>
                                                <option value="03:00">
                                                    03:00
                                                </option>
                                                <option value="04:00">
                                                    04:00
                                                </option>
                                                <option value="05:00">
                                                    05:00
                                                </option>
                                                <option value="06:00">
                                                    06:00
                                                </option>
                                                <option value="07:00">
                                                    07:00
                                                </option>
                                                <option value="08:00">
                                                    08:00
                                                </option>
                                                <option value="09:00">
                                                    09:00
                                                </option>
                                                <option value="10:00">
                                                    10:00
                                                </option>
                                                <option value="11:00">
                                                    11:00
                                                </option>
                                                <option value="12:00">
                                                    12:00
                                                </option>
                                                <option value="13:00">
                                                    13:00
                                                </option>
                                                <option value="14:00">
                                                    14:00
                                                </option>
                                                <option value="15:00">
                                                    15:00
                                                </option>
                                                <option value="16:00">
                                                    16:00
                                                </option>
                                                <option value="17:00">
                                                    17:00
                                                </option>
                                                <option value="18:00">
                                                    18:00
                                                </option>
                                                <option value="19:00">
                                                    19:00
                                                </option>
                                                <option value="20:00">
                                                    20:00
                                                </option>
                                                <option value="21:00">
                                                    21:00
                                                </option>
                                                <option value="22:00">
                                                    22:00
                                                </option>
                                                <option value="23:00">
                                                    23:00
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="row mt-3">
                                        <div className="col-12">
                                            <select name="cameraid" value={selectedCamera ? selectedCamera : ""} onChange={(e) => setSelectedCamera(e.target.value)} className="form-control">
                                                {cameras.map((camera, index) => (
                                                    // {filteredCameras.map((camera, index) => (
                                                    // {filteredCamerasName.map((camera, index) => (
                                                    <option
                                                        key={index}
                                                        value={camera.camera_id}
                                                    >
                                                        {camera.location.name} - {camera.camera_id}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-12">

                                            {selectedCamera && (
                                                <div>
                                                    {cameras
                                                        .filter((camera) => camera.camera_id === selectedCamera)
                                                        .map((camera) => (
                                                            <div key={camera.image_metadata.md5}>
                                                                <p><img src={camera.image} style={{ maxWidth: '100%', marginTop: 20 }} /></p>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </Layout>
    );
}

interface CageLocation {
    latitude: number;
    longitude: number;
    locationName: string;
}
const locationData: CageLocation[] = [
    {
        longitude: 103.871146,
        latitude: 1.29531332,
        locationName: 'Tanjong Rhu, East Coast Parkway, Singapore 437440, Singapore'
    },
    {
        longitude: 103.8785627,
        latitude: 1.319541067,
        locationName: 'Pan-Island Expressway, Singapore 387293, Singapore'
    },
    {
        longitude: 103.8728576,
        latitude: 1.323957439,
        locationName: 'Pan-Island Expressway, Singapore 339630, Singapore'
    },
    {
        longitude: 103.8750668,
        latitude: 1.319535712,
        locationName: 'Kallang Way Flyover, Singapore 339695, Singapore'
    },
    {
        longitude: 103.905394,
        latitude: 1.363519886,
        locationName: 'Defu Flyover, Tampines Road, Singapore 530320, Singapore'
    },
    {
        longitude: 103.902042,
        latitude: 1.357098686,
        locationName: 'Kallang-Paya Lebar Expressway, Singapore 539356, Singapore'
    },
    {
        longitude: 103.953997,
        latitude: 1.365434,
        locationName: 'Tampines Expressway, Singapore 510126, Singapore'
    },
    {
        longitude: 103.961412,
        latitude: 1.3605,
        locationName: 'Loyang Avenue, Singapore 510149, Singapore'
    },
    {
        longitude: 103.988598,
        latitude: 1.317036,
        locationName: 'On-Road Cycling Lane, Singapore 498736, Singapore'
    },
    {
        longitude: 103.851316802547,
        latitude: 1.27414394350065,
        locationName: 'Marina Coastal Expressway, Singapore 018962, Singapore'
    },
    {
        longitude: 103.861828440597,
        latitude: 1.27135090682664,
        locationName: 'Marina Coastal Expressway, Singapore 018988, Singapore'
    },
    {
        longitude: 103.856977943394,
        latitude: 1.27066408655104,
        locationName: 'Marina Coastal Expressway, Singapore 018990, Singapore'
    },
    {
        longitude: 103.876056196568,
        latitude: 1.29409891409364,
        locationName: 'Marina Coastal Expressway, Singapore 437437, Singapore'
    },
    {
        longitude: 103.866390381759,
        latitude: 1.2752977149006,
        locationName: 'Marina Coastal Expressway, Singapore 018988, Singapore'
    },
    {
        longitude: 103.8587802,
        latitude: 1.323604823,
        locationName: "7 Saint George's Lane, Singapore 320007, Singapore"
    },
    {
        longitude: 103.8601984,
        latitude: 1.34355015,
        locationName: 'Central Expressway, Singapore 359363, Singapore'
    },
    {
        longitude: 103.862203282048,
        latitude: 1.32814722194857,
        locationName: 'Central Expressway, Singapore 328704, Singapore'
    },
    {
        longitude: 103.837524510188,
        latitude: 1.28569398886979,
        locationName: 'Chin Swee Road, Singapore 168622, Singapore'
    },
    {
        longitude: 103.8587986,
        latitude: 1.375925022,
        locationName: 'Central Expressway, Singapore 560551, Singapore'
    },
    {
        longitude: 103.85806,
        latitude: 1.38861,
        locationName: 'Central Expressway, Singapore 806105, Singapore'
    },
    {
        longitude: 103.830451146503,
        latitude: 1.28036584335876,
        locationName: 'Central Expressway, Singapore 169545, Singapore'
    },
    {
        longitude: 103.845603032574,
        latitude: 1.31384231654635,
        locationName: 'North-South Corridor, Singapore 329565, Singapore'
    },
    {
        longitude: 103.85719,
        latitude: 1.35296,
        locationName: 'Central Expressway, Singapore 579828, Singapore'
    },
    {
        longitude: 103.7716543,
        latitude: 1.447023728,
        locationName: '214 Marsiling Lane, Singapore 730214, Singapore'
    },
    {
        longitude: 103.7683397,
        latitude: 1.445554109,
        locationName: 'Woodlands Checkpoint, 21 Woodlands Crossing, Singapore 738203, Singapore'
    },
    {
        longitude: 103.791033581325,
        latitude: 1.35047790791386,
        locationName: 'unnamed road, Singapore 286966, Singapore'
    },
    {
        longitude: 103.769311,
        latitude: 1.429588536,
        locationName: 'Bukit Timah Expressway, Singapore 738799, Singapore'
    },
    {
        longitude: 103.7794698,
        latitude: 1.36728572,
        locationName: 'Bukit Timah Expressway, Singapore 679518, Singapore'
    },
    {
        longitude: 103.771168,
        latitude: 1.414142,
        locationName: 'Bukit Timah Expressway, Singapore 728654, Singapore'
    },
    {
        longitude: 103.774247,
        latitude: 1.3983,
        locationName: 'Bukit Timah Expressway, Singapore 677721, Singapore'
    },
    {
        longitude: 103.7747,
        latitude: 1.3865,
        locationName: 'Fajar, Bukit Timah Expressway, Singapore 679944, Singapore'
    },
    {
        longitude: 103.98032,
        latitude: 1.33831,
        locationName: 'East Coast Parkway, Singapore 819665, Singapore'
    },
    {
        longitude: 103.880314665981,
        latitude: 1.2958550156561,
        locationName: 'Tanjong Rhu, East Coast Parkway, Singapore 431014, Singapore'
    },
    {
        longitude: 103.97383,
        latitude: 1.32743,
        locationName: 'East Coast Parkway, Singapore 499739, Singapore'
    },
    {
        longitude: 103.9350504,
        latitude: 1.309330837,
        locationName: 'Laguna Flyover, Bedok South Avenue 1, Singapore 468960, Singapore'
    },
    {
        longitude: 103.910596320237,
        latitude: 1.30145145166066,
        locationName: 'Still Road South, Singapore 441065, Singapore'
    },
    {
        longitude: 103.8983019,
        latitude: 1.297512569,
        locationName: 'Tanjong Katong Flyover, Tanjong Katong Road South, Singapore 449874, Singapore'
    },
    {
        longitude: 103.885283049309,
        latitude: 1.29565733262976,
        locationName: 'Tanjong Rhu Flyover, Marina East Drive, Singapore 437874, Singapore'
    },
    {
        longitude: 103.8615987,
        latitude: 1.29158484,
        locationName: 'Marina Centre Terminal, Singapore 039192, Singapore'
    },
    {
        longitude: 103.79633,
        latitude: 1.2871,
        locationName: 'Ayer Rajah Expressway, Singapore 118998, Singapore'
    },
    {
        longitude: 103.8324,
        latitude: 1.27237,
        locationName: 'Ayer Rajah Expressway, Singapore 099418, Singapore'
    },
    {
        longitude: 103.6350413,
        latitude: 1.348697862,
        locationName: 'Tuas Checkpoint, Tuas Checkpoint - Block A1, Singapore 639937, Singapore'
    },
    {
        longitude: 103.82375,
        latitude: 1.27877,
        locationName: 'Lower Delta Flyover, CTE, Singapore 090019, Singapore'
    },
    {
        longitude: 103.73028,
        latitude: 1.32618,
        locationName: 'Ayer Rajah Expressway, Singapore 618274, Singapore'
    },
    {
        longitude: 103.78205,
        latitude: 1.29792,
        locationName: 'Ayer Rajah Expressway, Singapore 117541, Singapore'
    },
    {
        longitude: 103.652700847056,
        latitude: 1.33344648135658,
        locationName: 'Jalan Ahmad Ibrahim, Singapore 638377, Singapore'
    },
    {
        longitude: 103.7799,
        latitude: 1.29939,
        locationName: 'Ayer Rajah Expressway, Singapore 138683, Singapore'
    },
    {
        longitude: 103.763002,
        latitude: 1.312019,
        locationName: 'Ayer Rajah Expressway, Singapore 120428, Singapore'
    },
    {
        longitude: 103.75273,
        latitude: 1.32153,
        locationName: 'Ayer Rajah Expressway, Singapore 126754, Singapore'
    },
    {
        longitude: 103.6439134,
        latitude: 1.341244001,
        locationName: 'Jalan Ahmad Ibrahim, Singapore 638377, Singapore'
    },
    {
        longitude: 103.6366955,
        latitude: 1.347645829,
        locationName: 'unnamed road, Singapore 639937, Singapore'
    },
    {
        longitude: 103.76438,
        latitude: 1.31023,
        locationName: 'Ayer Rajah Expressway, Singapore 120426, Singapore'
    },
    {
        longitude: 103.67453,
        latitude: 1.32227,
        locationName: 'Ayer Rajah Expressway, Singapore 628117, Singapore'
    },
    {
        longitude: 103.823611110166,
        latitude: 1.25999999687243,
        locationName: 'Sentosa Boardwalk, Singapore 098137, Singapore'
    },
    {
        longitude: 103.823888890049,
        latitude: 1.26027777363278,
        locationName: 'Sentosa Gateway, Singapore 098585, Singapore'
    },
    {
        longitude: 103.9168616,
        latitude: 1.3309693,
        locationName: 'Chai Chee, Pan-Island Expressway, Singapore 469032, Singapore'
    },
    {
        longitude: 103.905625,
        latitude: 1.326024822,
        locationName: 'Eunos Flyover, Pan-Island Expressway, Singapore 400330, Singapore'
    },
    {
        longitude: 103.8910793,
        latitude: 1.322875288,
        locationName: 'Paya Lebar Flyover, Pan-Island Expressway, Singapore 380114, Singapore'
    },
    {
        longitude: 103.877174116489,
        latitude: 1.32036078126842,
        locationName: 'Kallang-Paya Lebar Expressway, Balam Gardens, Singapore 370079, Singapore'
    },
    {
        longitude: 103.8685191,
        latitude: 1.328171608,
        locationName: 'Woodsville Flyover, Bendemeer Road, Singapore 347848, Singapore'
    },
    {
        longitude: 103.858222,
        latitude: 1.329334,
        locationName: 'Pan-Island Expressway, Singapore 328958, Singapore'
    },
    {
        longitude: 103.84121,
        latitude: 1.328899,
        locationName: 'Jalan Toa Payoh, Singapore 297743, Singapore'
    },
    {
        longitude: 103.826857295633,
        latitude: 1.32657403632366,
        locationName: 'Mount Pleasant Flyover, Mount Pleasant Road, Singapore 297834, Singapore'
    },
    {
        longitude: 103.81768,
        latitude: 1.332124,
        locationName: 'Pan-Island Expressway, Singapore 289899, Singapore'
    },
    {
        longitude: 103.7952799,
        latitude: 1.349428893,
        locationName: 'Pan-Island Expressway, Singapore 286966, Singapore'
    },
    {
        longitude: 103.69016,
        latitude: 1.345996,
        locationName: 'Pan-Island Expressway, Singapore 640849, Singapore'
    },
    {
        longitude: 103.78577,
        latitude: 1.344205,
        locationName: 'Rifle Range Nature Park, Jalan Jurong Kechil, Singapore 588177, Singapore'
    },
    {
        longitude: 103.977827,
        latitude: 1.33771,
        locationName: 'Pan-Island Expressway, Singapore 486798, Singapore'
    },
    {
        longitude: 103.770278,
        latitude: 1.332691,
        locationName: 'Pan-Island Expressway, Singapore 599435, Singapore'
    },
    {
        longitude: 103.945652,
        latitude: 1.340298,
        locationName: 'Pan-Island Expressway, Singapore 520112, Singapore'
    },
    {
        longitude: 103.703341,
        latitude: 1.361742,
        locationName: 'KJE, Singapore 648170, Singapore'
    },
    {
        longitude: 103.716071,
        latitude: 1.356299,
        locationName: 'Hong Kah, Pan-Island Expressway, Singapore 640558, Singapore'
    },
    {
        longitude: 103.6635051,
        latitude: 1.322893,
        locationName: 'Tuas Flyover, Gul, Tuas Road, Singapore 638483, Singapore'
    },
    {
        longitude: 103.963782,
        latitude: 1.354245,
        locationName: 'Upper Changi Flyover, Upper Changi Road North, Singapore 520348, Singapore'
    },
    {
        longitude: 103.92946983,
        latitude: 1.37704704,
        locationName: 'Tampines Expressway, Singapore 510759, Singapore'
    },
    {
        longitude: 103.92009174,
        latitude: 1.37988658,
        locationName: 'Tampines Expressway, Singapore 520175, Singapore'
    },
    {
        longitude: 103.91585701,
        latitude: 1.38432741,
        locationName: 'Tampines Expressway, Singapore 520175, Singapore'
    },
    {
        longitude: 103.90515712,
        latitude: 1.39559294,
        locationName: 'Tampines Expressway, Singapore 820136, Singapore'
    },
    {
        longitude: 103.85702534,
        latitude: 1.40002575,
        locationName: 'Seletar West Link, Singapore 798061, Singapore'
    },
    {
        longitude: 103.85400467,
        latitude: 1.39748842,
        locationName: 'Seletar Flyover, Seletar Interchange, Singapore 798061, Singapore'
    },
    {
        longitude: 103.74143,
        latitude: 1.38647,
        locationName: 'Choa Chu Kang West Flyover, Choa Chu Kang Way, Singapore 680433, Singapore'
    },
    {
        longitude: 103.7717,
        latitude: 1.39059,
        locationName: 'Gali Batu Flyover, Fajar, Bukit Panjang Park Connector, Singapore 677721, Singapore'
    },
    {
        longitude: 103.74843,
        latitude: 1.3899,
        locationName: 'Kranji Expressway, Singapore 680766, Singapore'
    },
    {
        longitude: 103.70899,
        latitude: 1.3664,
        locationName: 'Tengah Flyover, KJE, Singapore 648170, Singapore'
    },
    {
        longitude: 103.83474601,
        latitude: 1.39466333,
        locationName: 'Lentor Flyover, Lentor Avenue, Singapore 787833, Singapore'
    },
    {
        longitude: 103.81797086,
        latitude: 1.39474081,
        locationName: 'Upper Thomson Flyover, Springleaf, Upper Thomson Road, Singapore 787110, Singapore'
    },
    {
        longitude: 103.773005,
        latitude: 1.422857,
        locationName: 'Seletar Expressway, Singapore 739065, Singapore'
    },
    {
        longitude: 103.79542062,
        latitude: 1.42214311,
        locationName: 'Ulu Sembawang Flyover, Seletar Expressway, Singapore 737924, Singapore'
    },
    {
        longitude: 103.78716637,
        latitude: 1.42627712,
        locationName: 'Seletar Expressway, Singapore 737913, Singapore'
    },
    {
        longitude: 103.80642712,
        latitude: 1.41270056,
        locationName: 'Mandai Lake Flyover, Mandai Road, Singapore 779393, Singapore'
    }
];

const getLocationName = async (latitude: number, longitude: number): Promise<string> => {
    const existingLocation = locationData.some(loc => loc.latitude === latitude && loc.longitude === longitude);
    if (existingLocation) {
        // If the location is already in the array, return the location name from the array
        const locationName = locationData.find(loc => loc.latitude === latitude && loc.longitude === longitude)?.locationName;
        return locationName || '';
    } else {
        // If the location is not in the array, fetch the location name from the API
        const OPENCAGE_API_KEY = process.env.OPEN_CAGE_API_KEY;
        const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?key=${OPENCAGE_API_KEY}&q=${latitude}+${longitude}&pretty=1`);
        const data = await response.json();
        const locationName = data.results[0].formatted;
        locationData.push({ longitude, latitude, locationName });
        return locationName;
    }
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const time = now.toLocaleTimeString('en-SG', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateTime = `${date}T${time}`;

    const res = await fetch(`https://api.data.gov.sg/v1/transport/traffic-images?date_time=${dateTime}`);
    const trafficData: TrafficData = await res.json();

    for (const item of trafficData.items) {
        for (const camera of item.cameras) {
            const locationName = await getLocationName(camera.location.latitude, camera.location.longitude);
            camera.location.name = locationName;
        }
    }

    const response = await fetch('https://api.data.gov.sg/v1/environment/2-hour-weather-forecast');
    const weatherData: WeatherData = await response.json();


    return { props: { trafficData, weatherData, date, time } };
};