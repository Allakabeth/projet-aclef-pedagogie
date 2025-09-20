const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://eialndnxyxkcknrjpupp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpYWxuZG54eXhrY2tucmpwdXBwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4MzQ5NywiZXhwIjoyMDcyNjU5NDk3fQ.okrEsM2wyspZoPPgwV90eBaFVnNJRQgRNvuvhKkFMVU'
);

async function examineQuizData() {
  console.log('🔍 Examen de la structure quiz_data...');

  try {
    // Récupérer un quiz avec ses données complètes
    const { data: quizzes, error } = await supabase
      .from('quiz')
      .select('id, title, quiz_data')
      .limit(2);

    if (error) {
      console.log('❌ Erreur:', error.message);
      return;
    }

    quizzes.forEach((quiz, index) => {
      console.log(`\n📋 QUIZ ${index + 1}: ${quiz.title}`);
      console.log('ID:', quiz.id);

      if (quiz.quiz_data) {
        console.log('\n🎯 STRUCTURE QUIZ_DATA:');
        console.log(JSON.stringify(quiz.quiz_data, null, 2));

        // Analyser la structure
        if (quiz.quiz_data.questions) {
          console.log(`\n📝 QUESTIONS (${quiz.quiz_data.questions.length}):`);
          quiz.quiz_data.questions.forEach((question, qIndex) => {
            console.log(`\nQuestion ${qIndex + 1}:`);
            console.log(`  Type: ${question.type || 'N/A'}`);
            console.log(`  Texte: ${question.question || question.text || 'N/A'}`);
            console.log(`  Réponses: ${question.answers ? question.answers.length : 'N/A'}`);

            if (question.answers) {
              question.answers.forEach((answer, aIndex) => {
                console.log(`    ${aIndex + 1}. ${answer.text} ${answer.correct ? '✅' : '❌'}`);
              });
            }
          });
        }

        if (quiz.quiz_data.settings) {
          console.log('\n⚙️ SETTINGS:');
          console.log(JSON.stringify(quiz.quiz_data.settings, null, 2));
        }

        if (quiz.quiz_data.accessibility) {
          console.log('\n♿ ACCESSIBILITY:');
          console.log(JSON.stringify(quiz.quiz_data.accessibility, null, 2));
        }

        if (quiz.quiz_data.feedback) {
          console.log('\n💬 FEEDBACK:');
          console.log(JSON.stringify(quiz.quiz_data.feedback, null, 2));
        }
      }

      console.log('\n' + '='.repeat(80));
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

examineQuizData();