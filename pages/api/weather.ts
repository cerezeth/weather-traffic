import { NextApiHandler } from 'next';

const handler: NextApiHandler = async (req, res) => {
  const response = await fetch('https://api.data.gov.sg/v1/environment/2-hour-weather-forecast');
  const data = await response.json();
  res.status(200).json(data);
};

export default handler;
