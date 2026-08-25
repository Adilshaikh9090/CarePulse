import { BookOpen, Moon, Phone, Wind } from 'lucide-react'
import { Card, PageHeader, DisclaimerNote } from '../../components/ui'

const RESOURCES = [
  { icon: Moon, title: 'Sleep hygiene basics', text: 'Keep regular sleep/wake times, dim screens an hour before bed, and keep the room cool and dark. Short 20-minute naps before night duty help without harming night sleep.' },
  { icon: Wind, title: 'Quick stress resets', text: 'Try box breathing (4s in · 4s hold · 4s out · 4s hold) for two minutes. A short walk after long briefings lowers tension measurably.' },
  { icon: BookOpen, title: 'Managing workload pressure', text: 'Rank tasks by urgency, batch similar work, and flag sustained overload early via your check-in — trends feed the early-warning review.' },
  { icon: Phone, title: 'Confidential support lines', text: 'Demo helpline 1800-000-000 (fictional). Welfare officers can arrange voluntary, confidential consultations on request.' },
]

const FAQ = [
  ['Who can see my individual responses?', 'Only authorized welfare reviewers, and only when a supportive follow-up is needed. Supervisors otherwise see anonymized aggregates.'],
  ['Can a prediction affect my appraisal?', 'No. Indicators exist solely to trigger welfare support. They are not performance or medical assessments.'],
  ['How do I export or delete my data?', 'Settings → Data & privacy lets you download everything stored about you; consent toggles control what continues to be collected.'],
  ['What does "High" really mean?', 'That several indicators rose together — it suggests scheduling a supportive human review soon. It is not a diagnosis.'],
]

export default function Wellness() {
  return (
    <>
      <PageHeader title="Wellness hub" subtitle="Practical guidance, resources and answers about how the system protects you." />
      <div className="grid gap-4 md:grid-cols-2">
        {RESOURCES.map(({ icon: Icon, title, text }) => (
          <Card key={title}>
            <span className="inline-flex rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300"><Icon /></span>
            <h3 className="mt-3 text-sm font-semibold text-slate-100">{title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{text}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4" title="Frequently asked questions" subtitle="Transparency about the AI and your rights">
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-xl bg-subtle px-4 py-3 ring-1 ring-line">
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-200 marker:hidden group-open:text-sky-300">
                {q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{a}</p>
            </details>
          ))}
        </div>
      </Card>

      <div className="mt-4"><DisclaimerNote>
        Content here is general wellbeing guidance for the prototype demo — not medical advice.
        If you are struggling, please contact a qualified professional or the confidential helpline.
      </DisclaimerNote></div>
    </>
  )
}
