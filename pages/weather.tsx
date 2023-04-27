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
    const [filterTrafficName, setFilterTrafficName] = useState<string>("");
    const [filterTraffic, setFilterTraffic] = useState<string>("");
    const [filterDate, setFilterDate] = useState<string>("");
    const [filterTime, setFilterTime] = useState<string>("");
    const [filterForecast, setFilterForecast] = useState<string>("");
    const [newTrafficData, setNewTrafficData] = useState<TrafficData>(trafficData);
    const [forecastArea, setForecastArea] = useState<string>("");
    const [forecasts, setForecasts] = useState<Forecast[]>(weatherData.items.flatMap(item => item.forecasts));
    // trafficData.items[0].cameras[0].location
    // weatherData.area_metadata[0].label_location
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





    const [newWeatherData, setNewWeatherData] = useState<WeatherData>(weatherData);



    const filteredCameras = cameras.filter((camera) =>
        camera.camera_id.toLowerCase().includes(filterTraffic.toLowerCase())
    );

    // const filteredCamerasName = cameras.filter((camera) =>
    //     camera.location.name.toLowerCase().includes(filterTrafficName.toLowerCase())
    // );

    // const filteredForecast = forecasts.filter((forecast => 
    //     forecast.area.toLowerCase === filterForecast.toLowerCase() 
    // ));

    async function handleFilterDateChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFilterDate(e.target.value);
        await fetchTrafficData(e.target.value, filterTime);
    }

    async function handleFilterTimeChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setFilterTime(e.target.value);
        await fetchTrafficData(filterDate, e.target.value);
    }

    async function handleForecastChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForecastArea(e.target.value);
    }

    async function fetchTrafficData(date: string, time: string) {
        // console.log('ran fetch')
        const dateTime = `${date}T${time}:00`;
        const res = await fetch(`https://api.data.gov.sg/v1/transport/traffic-images?date_time=${dateTime}`);
        const trafficData: TrafficData = await res.json();
        setNewTrafficData(trafficData);
    }


    useEffect(() => {

        try {
            // console.log('ran useeffgect')
            // console.log(newTrafficData)
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
                        <h1>Weather Forecast</h1>
                        {newWeatherData && newWeatherData.items && newWeatherData.items.length > 0 && (
                            <div className="card">
                                <div className="card-body">
                                    {/* <h5 className="card-title">{newWeatherData.items[0].timestamp}</h5> */}                                    
                                    <select name="forecast" onChange={(e) => setFilterForecast(e.target.value)} className="form-control">
                                        {newWeatherData.items[0].forecasts.map((forecast) => (
                                            <option key={forecast.area}
                                                value={forecast.area}>
                                                {forecast.area}
                                                {/* <h3>{forecast.area}</h3>
                                        <p>{forecast.forecast}</p> */}
                                            </option>
                                        ))}
                                    </select>
                                    {forecasts.filter(forecast => forecast.area === filterForecast).map((forecast) => (
                                        <div key={forecast.area} className="mt-3">
                                            <h3>{forecast.area}</h3>
                                            <p>{forecast.forecast}</p>
                                        </div>
                                    ))}
                                    {forecastArea}

                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="row mt-5">
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
                        {/* <input
                            type="time"
                            value={filterTime}
                            // onChange={(e) => setFilterTime(e.target.value)}    
                            onChange={handleFilterTimeChange}
                            placeholder="Time"
                        /> */}
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
                    {/* <div className="col-6">
                        <input
                            type="text"
                            value={filterTraffic}
                            onChange={(e) => setFilterTraffic(e.target.value)}
                            placeholder="Filter cameras by ID"
                        />
                        <input
                            type="text"
                            value={filterTrafficName}
                            onChange={(e) => setFilterTrafficName(e.target.value)}
                            placeholder="Filter cameras by name"
                            className="form-control"
                        />
                    </div> */}
                    <div className="col-6">
                        <select name="cameraid" onChange={(e) => setSelectedCamera(e.target.value)} className="form-control">
                            {filteredCameras.map((camera, index) => (
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
                                {/* <h3>{selectedCamera}</h3> */}
                                {cameras
                                    .filter((camera) => camera.camera_id === selectedCamera)
                                    .map((camera) => (
                                        <div key={camera.image_metadata.md5}>
                                            {/* <p>Timestamp: {camera.timestamp}</p>
                                    <p>Image URL: <img src={camera.image} /></p>
                                    <p>Latitude: {camera.location.latitude}</p>
                                    <p>Longitude: {camera.location.longitude}</p>
                                    <p>MD5: {camera.image_metadata.md5}</p> */}
                                            <h3>{camera.location.name}</h3>
                                            <p><img src={camera.image} style={{ maxWidth: '100%' }} /></p>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

const getLocationName = async (latitude: number, longitude: number): Promise<string> => {
    const OPENCAGE_API_KEY = process.env.OPEN_CAGE_API_KEY;
    const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?key=${OPENCAGE_API_KEY}&q=${latitude}+${longitude}&pretty=1`);
    const data = await response.json();
    const locationName = data.results[0].formatted;
    return locationName;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const time = now.toLocaleTimeString('en-SG', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateTime = `${date}T${time}`;
    // console.log(dateTime)

    const res = await fetch(`https://api.data.gov.sg/v1/transport/traffic-images?date_time=${dateTime}`);
    const trafficData: TrafficData = await res.json();

    // for (const item of trafficData.items) {
    //     for (const camera of item.cameras) {
    //         const locationName = await getLocationName(camera.location.latitude, camera.location.longitude);
    //         camera.location.name = locationName;
    //     }
    // }


    const response = await fetch('https://api.data.gov.sg/v1/environment/2-hour-weather-forecast');
    const weatherData: WeatherData = await response.json();


    return { props: { trafficData, weatherData, date, time } };
};

