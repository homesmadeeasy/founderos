import { MessageSquare } from 'lucide-react'

export default function ProjectChatPage() {
  return (
    <div className="max-w-3xl flex flex-col h-[calc(100vh-220px)]">
      <div className="flex-1 bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
          <MessageSquare size={18} className="text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700">AI Chat</p>
          <p className="text-sm text-zinc-400 mt-1">Chat with AI about this project.</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          placeholder="Ask anything about this project..."
          className="flex-1 px-4 py-3 text-sm bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-400 transition-colors"
        />
        <button className="px-4 py-3 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-700 transition-colors">
          Send
        </button>
      </div>
    </div>
  )
}
