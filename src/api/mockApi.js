export default function handler(req, res) {
  res.status(200).json({
    data: ["React 19 Item 1", "React 19 Item 2", "React 19 Item 3"],
  });
}
