/**
 * SISTEMA DE EVALUACIÓN PSICOMOTRIZ Y ATENCIÓN ÓCULO-MANUAL
 * Analiza variables neurocognitivas y psicomotrices recolectadas durante las sesiones de tiro.
 */
class MotorEvaluationEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.shots = []; // Registro de cada tiro: { timestamp, reactionTime, power, angle, scored, points, slotIndex }
    this.currentStreak = 0;
    this.maxStreak = 0;
    this.totalScore = 0;
  }

  recordShot(data) {
    this.shots.push(data);
    if (data.scored) {
      this.currentStreak++;
      if (this.currentStreak > this.maxStreak) {
        this.maxStreak = this.currentStreak;
      }
      this.totalScore += data.points;
    } else {
      this.currentStreak = 0;
    }
  }

  generateReport() {
    const totalShots = this.shots.length;
    if (totalShots === 0) {
      return {
        score: 0,
        accuracy: 0,
        maxStreak: 0,
        avgReactionTime: 0,
        oculomanualIndex: 0,
        level: 'Sin Registro',
        description: 'No se realizaron tiros en este turno.',
        recommendation: 'Intenta realizar lanzamientos midiendo la tensión de la catapulta.',
        gradeIcon: '⏳'
      };
    }

    const scoredShots = this.shots.filter(s => s.scored);
    const accuracy = Math.round((scoredShots.length / totalShots) * 100);

    // Tiempo medio de reacción / deliberación (segundos)
    const totalReaction = this.shots.reduce((acc, s) => acc + (s.reactionTime || 1.5), 0);
    const avgReactionTime = (totalReaction / totalShots / 1000).toFixed(2);

    // Estabilidad motriz (desviación de potencia en aciertos)
    const powers = this.shots.map(s => s.power);
    const meanPower = powers.reduce((a, b) => a + b, 0) / totalShots;
    const powerVariance = powers.reduce((a, b) => a + Math.pow(b - meanPower, 2), 0) / totalShots;
    const powerStdDev = Math.sqrt(powerVariance);

    // Índice de Atención Óculo-Manual (0 - 100):
    // Combina: 45% Precisión de enceste + 25% Racha sostenida + 15% Estabilidad motriz + 15% Ritmo de tiro
    let precisionFactor = accuracy * 0.45;
    let streakFactor = Math.min((this.maxStreak / Math.max(4, totalShots * 0.4)) * 25, 25);
    let stabilityFactor = Math.max(0, 15 - powerStdDev * 8);
    let rhythmFactor = (avgReactionTime >= 1.0 && avgReactionTime <= 3.8) ? 15 : 9;

    let oculomanualIndex = Math.round(precisionFactor + streakFactor + stabilityFactor + rhythmFactor);
    oculomanualIndex = Math.max(10, Math.min(100, oculomanualIndex));

    let level = '';
    let gradeIcon = '🎯';
    let description = '';
    let recommendation = '';

    if (oculomanualIndex >= 88) {
      level = 'Sobresaliente - Alta Precisión Visomotora';
      gradeIcon = '🌟';
      description = 'Excelente sincronía entre el campo visual y la modulación neuromuscular. Tu capacidad de cálculo de parábola y enfoque continuo es óptima.';
      recommendation = 'Intenta ahora disparar a mayor velocidad para potenciar reflejos bajo presión temporal.';
    } else if (oculomanualIndex >= 75) {
      level = 'Muy Bueno - Coordinación y Enfoque Sólidos';
      gradeIcon = '🎯';
      description = 'Gran control psicomotor y estabilidad en el tiro. Mantienes una concentración firme en la diana durante la mayoría de los lanzamientos.';
      recommendation = 'Focaliza la vista en el orificio central de 50 puntos antes de soltar la catapulta para aumentar tu racha.';
    } else if (oculomanualIndex >= 60) {
      level = 'Bueno - Control en Desarrollo Activo';
      gradeIcon = '👍';
      description = 'Buena capacidad de ajuste tras fallos sucesivos. Lograste calibrar la fuerza progresivamente en la huevera.';
      recommendation = 'Realiza una pausa de 1 segundo para fijar la mirada en el objetivo antes de liberar el tiro.';
    } else if (oculomanualIndex >= 40) {
      level = 'En Progreso - Calibrando Fuerza y Ángulo';
      gradeIcon = '🌱';
      description = 'Se observa variabilidad en la potencia aplicada. Tu cerebro está asimilando la distancia y profundidad del objetivo.';
      recommendation = 'Presta atención a la línea guía de trayectoria punteada para memorizar la curvatura adecuada.';
    } else {
      level = 'Iniciación - Estimulación Temprana';
      gradeIcon = '💡';
      description = 'Ejercicio ideal para despertar la motricidad fina y la fijación ocular en metas tridimensionales.';
      recommendation = 'Tómate un par de segundos extra para tirar con suavidad y observar dónde rebota la pelota.';
    }

    return {
      score: this.totalScore,
      totalShots,
      scoredShots: scoredShots.length,
      accuracy,
      maxStreak: this.maxStreak,
      avgReactionTime,
      oculomanualIndex,
      level,
      description,
      recommendation,
      gradeIcon
    };
  }
}

window.motorEvaluationEngine = new MotorEvaluationEngine();
