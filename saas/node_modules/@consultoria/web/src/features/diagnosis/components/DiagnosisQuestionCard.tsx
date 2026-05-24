import type { DiagnosisQuestion } from '../types';

interface DiagnosisQuestionCardProps {
  index: number;
  question: DiagnosisQuestion;
  value?: number;
  onSelect: (value: number) => void;
}

export function DiagnosisQuestionCard({ index, question, value, onSelect }: DiagnosisQuestionCardProps) {
  return (
    <article className="question-card">
      <div className="question-topline">
        <span>{index}</span>
        <small>Escala de 1 a 5</small>
      </div>
      <h3>{question.title}</h3>
      <p>{question.helperText}</p>
      <div className="option-scale">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            className={value === score ? 'score-option active' : 'score-option'}
            onClick={() => onSelect(score)}
          >
            {score}
          </button>
        ))}
      </div>
    </article>
  );
}
