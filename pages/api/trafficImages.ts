import { NextApiHandler } from 'next';

const handler: NextApiHandler = async (req, res) => {
  const response = await fetch('https://api.data.gov.sg/v1/transport/traffic-images');
  const data = await response.json();
  res.status(200).json(data);
};

export default handler;

