"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { creatorAvatarUrl, followerTier } from "@/lib/utils";
import { formatFollowers, type CreatorResult } from "@/lib/api";

interface Props {
  creator: CreatorResult;
  selected: boolean;
  onToggle: () => void;
  index?: number;
}

export function CreatorAvatar({
  handle,
  name,
  profileImageUrl,
  size = 36,
}: {
  handle: string;
  name?: string;
  profileImageUrl?: string;
  size?: number;
}) {
  const fallback = creatorAvatarUrl(handle, name);
  const [src, setSrc] = useState(profileImageUrl || fallback);

  useEffect(() => {
    setSrc(profileImageUrl || fallback);
  }, [profileImageUrl, fallback]);

  return (
    <Image
      src={src}
      alt={name || handle}
      width={size}
      height={size}
      className="rounded-full bg-brand-100 object-cover"
      unoptimized
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
    />
  );
}

export function CreatorListRow({ creator, selected, onToggle, index }: Props) {
  const tier = followerTier(creator.followers);
  return (
    <tr className={`hover:bg-surface-muted/60 ${selected ? "bg-brand-50/50" : ""}`}>
      <td className="w-10 text-center text-xs text-neutral-400">{index}</td>
      <td className="w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 rounded border-neutral-300 accent-brand-600 focus:ring-brand-500"
        />
      </td>
      <td>
        <div className="flex items-center gap-3">
          <CreatorAvatar
            handle={creator.handle}
            name={creator.display_name}
            profileImageUrl={creator.profile_image_url}
          />
          <div>
            <a
              href={creator.profile_url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-neutral-900 hover:text-brand-600"
            >
              {creator.display_name}
            </a>
            <p className="text-xs text-neutral-500">@{creator.handle}</p>
          </div>
        </div>
      </td>
      <td className="text-neutral-600">{creator.audience_country || "—"}</td>
      <td>
        <span className="tag-brand">{tier}</span>
      </td>
      <td className="text-neutral-600">{creator.categories.split("|")[0] || creator.categories}</td>
      <td className="font-medium">{formatFollowers(creator.followers)}</td>
      <td>{(creator.engagement_rate * 100).toFixed(2)}%</td>
      <td>
        <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
          {Math.round(creator.score * 100)}%
        </span>
      </td>
      <td>
        <div className="flex flex-wrap gap-1">
          {creator.match_reasons.slice(0, 2).map((r) => (
            <span key={r} className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">
              {r}
            </span>
          ))}
        </div>
      </td>
    </tr>
  );
}

export function CreatorGridCard({ creator, selected, onToggle }: Props) {
  const tier = followerTier(creator.followers);
  return (
    <div
      className={`relative rounded-lg border bg-white p-4 shadow-card transition hover:border-brand-200 ${
        selected ? "border-brand-400 ring-1 ring-brand-200" : "border-surface-border"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="absolute left-3 top-3 h-4 w-4 rounded border-neutral-300 accent-brand-600 focus:ring-brand-500"
      />
      <div className="flex flex-col items-center pt-2 text-center">
        <CreatorAvatar
          handle={creator.handle}
          name={creator.display_name}
          profileImageUrl={creator.profile_image_url}
          size={64}
        />
        <h3 className="mt-3 font-medium text-neutral-900">{creator.display_name}</h3>
        <p className="text-xs text-neutral-500">@{creator.handle}</p>
        <div className="mt-2 flex gap-2">
          <span className="tag-brand">{tier}</span>
          <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
            {Math.round(creator.score * 100)}% match
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-neutral-500">{creator.categories}</p>
        <div className="mt-3 grid w-full grid-cols-3 gap-2 border-t border-surface-border pt-3 text-center text-xs">
          <div>
            <p className="font-semibold text-neutral-900">{formatFollowers(creator.followers)}</p>
            <p className="text-neutral-400">Followers</p>
          </div>
          <div>
            <p className="font-semibold text-neutral-900">{(creator.engagement_rate * 100).toFixed(1)}%</p>
            <p className="text-neutral-400">ER</p>
          </div>
          <div>
            <p className="font-semibold text-neutral-900 truncate">{creator.audience_country || "—"}</p>
            <p className="text-neutral-400">Audience</p>
          </div>
        </div>
      </div>
    </div>
  );
}
