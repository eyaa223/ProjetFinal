import axios from 'axios';

// 🔥 Appel service IA Flask
export const getClassementIA = async (req, res) => {
  try {
    const response = await axios.get('http://127.0.0.1:5001/classify', {
      timeout: 10000
    });

    if (!response.data) {
      return res.status(500).json({
        success: false,
        message: 'Aucune donnée reçue du service IA'
      });
    }

    return res.json({
      success: true,
      count: response.data.length,
      data: response.data
    });

  } catch (error) {
    console.error('Erreur IA:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(500).json({
        success: false,
        message: 'Service IA Flask non démarré'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erreur service IA'
    });
  }
};